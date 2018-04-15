#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');

const logDir = '/var/log';
const fileNameStartsWith = process.env.LOG_FILE_NAME_STARTS_WITH;
const logLineRegExp = /^(([0-9.]+)|([0-9a-f:]+)) \[([^\]]+)\] "([^"]*)" (.*)$/;
const dateRegExp = /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/;
const dataFile = '/data/data.json';
const dataFileGz = `${dataFile}.gz`;
const tooOld = new Date() - 31 * 24 * 60 * 60 * 1000;

if (!fileNameStartsWith) throw new Error('missing LOG_FILE_NAME_STARTS_WITH in env');

function getOldLogs() {
    return new Promise((resolve, reject) => {
        fs.readFile(dataFile, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // file does not exist - that's ok
                    resolve({});
                } else {
                    reject(err);
                }
                return;
            }
            try {
                const parsedData = JSON.parse(data);
                Object.values(parsedData).forEach((log) => {
                    // eslint-disable-next-line
                    log.timeParsed = new Date(log.timeParsed);
                });
                resolve(parsedData);
            } catch (JsonErr) {
                resolve({});
            }
        });
    });
}

async function writeOldLogs(oldLogs) {
    await new Promise((resolve, reject) => {
        fs.writeFile(
            dataFile,
            JSON.stringify(
                Object.values(oldLogs)
                    .reduce((acc, log) => Object.assign(acc, { [log.hash]: log }), {})
            ),
            (err) => {
                if (err) reject(err);
                else resolve();
            },
        );
    });

    fs.createReadStream(dataFile)
        .pipe(zlib.createGzip({ level: 9 }))
        .pipe(fs.createWriteStream(dataFileGz));
}

function parseDate(dateStr) {
    /* eslint-disable no-nested-ternary, indent */
    // 01/Jan/2018:08:32:20 +0100
    const match = dateStr.match(dateRegExp);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = match[2] === 'Jan' ? 0 :
                  match[2] === 'Feb' ? 1 :
                  match[2] === 'Mar' ? 2 :
                  match[2] === 'Apr' ? 3 :
                  match[2] === 'May' ? 4 :
                  match[2] === 'Jun' ? 5 :
                  match[2] === 'Jul' ? 6 :
                  match[2] === 'Aug' ? 7 :
                  match[2] === 'Sep' ? 8 :
                  match[2] === 'Oct' ? 9 :
                  match[2] === 'Nov' ? 10 :
                  match[2] === 'Dec' ? 11 : null;
    const year = parseInt(match[3], 10);
    const hours = parseInt(match[4], 10);
    const minutes = parseInt(match[5], 10);
    const seconds = parseInt(match[6], 10);
    const offOperator = match[7];
    const offHours = parseInt(match[8], 10);
    const offMinutes = parseInt(match[9], 10);
    /* eslint-enable no-nested-ternary, indent */

    const newDate = new Date(0);
    newDate.setUTCFullYear(year);
    newDate.setUTCMonth(month);
    newDate.setUTCDate(day);
    newDate.setUTCHours(offOperator === '+' ? hours - offHours : hours + offHours);
    newDate.setUTCMinutes(offOperator === '+' ? minutes - offMinutes : minutes + offMinutes);
    newDate.setUTCSeconds(seconds);

    return newDate;
}

function logLineHandler(line, oldLogs) {
    const match = line.match(logLineRegExp);
    if (!match) return {};

    const hash = crypto.createHash('sha1').update(line).digest('hex');

    if (oldLogs[hash]) return {};

    const remote = match[1];
    const ipv4 = match[2];
    const ipv6 = match[3];
    const time = match[4];
    const userAgent = match[5];
    const log = match[6];
    const timeParsed = parseDate(time);
    const logEscaped = log
        // encode percent character
        .replace(/%/g, '%25')
        // replace \xHH encoding with %HH
        .replace(
            /\\x([0-9A-Fa-f]{2})/g,
            (matchAll, match1) => `%${match1.toUpperCase()}`,
        );
    const logDecoded = decodeURIComponent(logEscaped);
    const logParsed = JSON.parse(logDecoded);
    const data = {
        [hash]: {
            remote, ipv4, ipv6, time, timeParsed, userAgent, hash, logParsed,
        },
    };

    if (timeParsed < tooOld) return {};

    Object.assign(oldLogs, data);
    return data;
}

function logFileHandler(fileName, oldLogs) {
    return new Promise((resolve, reject) => {
        const newData = {};
        const filePath = path.join(logDir, fileName);
        const rl = readline.createInterface({
            input: fileName.endsWith('.gz') ?
                fs.createReadStream(filePath).pipe(zlib.createGunzip()) :
                fs.createReadStream(filePath),
            crlfDelay: Infinity,
        });

        rl.on('error', reject);
        rl.on('line', line => Object.assign(newData, logLineHandler(line, oldLogs)));
        rl.on('close', () => resolve(newData));
    });
}

function readLogFiles(oldLogs) {
    return new Promise((resolve, reject) => {
        fs.readdir(logDir, async (err, fileList) => {
            if (err) {
                reject(err);
                return;
            }

            const prom = await Promise.all(fileList
                .filter(fileName => fileName.startsWith(fileNameStartsWith))
                .map(fileName => logFileHandler(fileName, oldLogs)));

            const newLog = prom.reduce((acc, val) => Object.assign(acc, val), {});
            resolve(newLog);
        });
    });
}

async function main() {
    const oldLogs = await getOldLogs();
    const newLogs = await readLogFiles(oldLogs);
    const relevantLogs = Object.values(oldLogs)
        .filter(log => log.timeParsed > tooOld)
        .reduce((acc, log) => Object.assign(acc, { [log.hash]: log }), {});
    const newErrors = Object.values(newLogs).filter(log => log.logParsed.level === 'ERROR');
    if (newErrors.length) process.stdout.write(JSON.stringify(newErrors, null, 4));
    writeOldLogs(relevantLogs);
}

main();
