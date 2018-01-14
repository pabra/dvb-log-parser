import Vue from 'vue';
import Router from 'vue-router';
import LogOverview from '@/components/LogOverview';

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: LogOverview.name,
            component: LogOverview,
        },
    ],
});
