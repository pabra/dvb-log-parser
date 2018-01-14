<template lang="pug">
    div
        h1 Log Overview

        div.filter
            b filter log level:
            ul
                li(
                    v-for="level in logLevelsAvailable"
                    :class="{active: logLevelsSelected.includes(level)}"
                )
                    label
                        input(
                            type="checkbox"
                            :checked="logLevelsSelected.includes(level)"
                            @click="toggleLevel(level)"
                        )
                        | {{ level }}
                        | ({{ logLevelsCountFiltered[level] }}/{{ logLevelsCountTotal[level] }})

        div.filter
            b filter logger name:
            ul
                li(
                    v-for="logger in logNamesAvailable"
                    :class="{active: logNamesSelected.includes(logger)}"
                )
                    label
                        input(
                            type="checkbox"
                            :checked="logNamesSelected.includes(logger)"
                            @click="toggleName(logger)"
                        )
                        | {{ logger }}
                        | ({{ logNamesCountFiltered[logger] }}/{{ logNamesCountTotal[logger] }})

        table
            thead
                tr
                    th remote
                    th time
                    th level
                    th name
                    th log
                    th user agent

            tbody(v-for="entry in sortedFilteredLogData" :key="entry.hash")
                tr
                    td.remote {{ entry.remote }}
                    td.time {{ entry.timeParsed.toLocaleString() }}
                    td.log-level {{ entry.logParsed.level }}
                    td.log-name {{ entry.logParsed.name }}
                    td.log
                        pre {{ entry.logParsed }}
                    td.user-agent {{ entry.userAgent }}
</template>

<script>
import _ from 'lodash';
import { xhrJson } from '@/lib/fetch';

function getLoggerName(logger) {
    return _.get(logger, 'logParsed.name', 'none');
}

export default {
    name: 'log-overview',
    data() {
        return {
            logData: [],
            logLevelsAvailable: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
            logLevelsSelected: ['WARN', 'ERROR'],
            logNamesSelected: [],
        };
    },
    computed: {
        sortedFilteredLogData() {
            return this.logData
                .slice(0)
                .sort((a, b) => {
                    // sort descending
                    if (a.timeParsed > b.timeParsed) return -1;
                    if (a.timeParsed < b.timeParsed) return 1;
                    return 0;
                })
                .filter(entry => (
                    this.logLevelsSelected.includes(entry.logParsed.level)
                    && this.logNamesSelected.includes(getLoggerName(entry))
                ));
        },
        logNamesAvailable() {
            return Array.from(this.logData
                .reduce((acc, entry) => {
                    acc.add(getLoggerName(entry));
                    return acc;
                },
                new Set())).sort();
        },
        logLevelsCountTotal() {
            return this.logLevelsAvailable
                .reduce((accu, level) => {
                    const count = this.logData.reduce((acc, entry) => (
                        acc + (entry.logParsed.level === level ? 1 : 0)
                    ), 0);

                    Object.assign(accu, { [level]: count });

                    return accu;
                },
                {});
        },
        logLevelsCountFiltered() {
            return this.logLevelsAvailable
                .reduce((accu, level) => {
                    const count = this.sortedFilteredLogData.reduce((acc, entry) => (
                        acc + (entry.logParsed.level === level ? 1 : 0)
                    ), 0);

                    Object.assign(accu, { [level]: count });

                    return accu;
                },
                {});
        },
        logNamesCountTotal() {
            return this.logNamesAvailable
                .reduce((accu, name) => {
                    const count = this.logData.reduce((acc, entry) => (
                        acc + (getLoggerName(entry) === name ? 1 : 0)
                    ), 0);

                    Object.assign(accu, { [name]: count });

                    return accu;
                },
                {});
        },
        logNamesCountFiltered() {
            return this.logNamesAvailable
                .reduce((accu, name) => {
                    const count = this.sortedFilteredLogData.reduce((acc, entry) => (
                        acc + (getLoggerName(entry) === name ? 1 : 0)
                    ), 0);

                    Object.assign(accu, { [name]: count });

                    return accu;
                },
                {});
        },
    },
    methods: {
        async getLogJson() {
            // const logData = await fetchJson({ url: 'static/log-parser/data/data.json' });
            const logData = await xhrJson('static/log-parser/data/data.json');

            if (logData.ok) {
                this.logData = Object.values(logData.data)
                    .map(entry => Object.assign(entry, { timeParsed: new Date(entry.timeParsed) }));

                this.logNamesAvailable.forEach(this.toggleName);
            }
        },
        toggleLevel(level) {
            const idx = this.logLevelsSelected.indexOf(level);
            if (idx === -1) this.logLevelsSelected.push(level);
            else this.logLevelsSelected.splice(idx, 1);
        },
        toggleName(name) {
            const idx = this.logNamesSelected.indexOf(name);
            if (idx === -1) this.logNamesSelected.push(name);
            else this.logNamesSelected.splice(idx, 1);
        },
    },
    created() {
        this.getLogJson();
    },
};
</script>

<style lang="scss" scoped>
    div.filter {
        ul {
            display: inline;

            li {
                list-style: none;
                display: inline-block;

                label {
                    display: inline;
                    border: 1px solid #aaa;
                    border-radius: 10px;
                    padding: 3px 6px;
                    margin: 0 3px;

                    input {
                        vertical-align: middle;
                        margin: 0 3px 2px 0px;
                    }
                }

                &.active {
                    label {
                        background-color: #f0f4c3;
                    }
                }
            }
        }
    }

    td.log {
        pre {
            max-width: 400px;
            max-height: 200px;
            margin: 0;
        }
    }
</style>
