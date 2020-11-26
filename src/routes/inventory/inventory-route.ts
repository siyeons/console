import { RouteConfig } from 'vue-router';

const CloudServicePage = () => import('@/views/inventory/cloud-service/pages/CloudServicePage.vue');
const CloudServiceSearch = () => import('@/views/inventory/cloud-service/pages/CloudServiceSearch.vue');
const CloudServiceTypeSearch = () => import('@/views/inventory/cloud-service/pages/CloudServiceTypeSearch.vue');

const Server = () => import('@/views/inventory/server/pages/ServerPage.vue');
const CloudService = () => import('@/views/inventory/cloud-service/pages/CloudServiceType.vue');
const NoResource = () => import('@/views/common/pages/NoResource.vue');

export default {
    path: 'inventory',
    name: 'inventory',
    redirect: 'inventory/server',
    meta: { label: 'Inventory' },
    component: { template: '<router-view />' },
    children: [
        {
            path: 'server',
            meta: {
                label: 'Server',
            },
            component: { template: '<router-view />' },
            children: [
                {
                    path: '/',
                    name: 'server',
                    component: Server,
                },
            ],
        },
        {
            path: 'cloud-service',
            name: 'cloudService',
            redirect: '/inventory/cloud-service',
            meta: { label: 'Cloud Service' },
            component: { template: '<router-view />' },
            children: [
                {
                    path: '/',
                    name: 'cloudServiceMain',
                    component: CloudService,
                },
                {
                    path: 'search/:searchKey/:id',
                    name: 'cloudServiceSearch',
                    meta: {
                        label: 'search',
                    },
                    props: true,
                    component: CloudServiceSearch,
                },
                {
                    path: 'type/search/:id',
                    name: 'cloudServiceTypeSearch',
                    meta: {
                        label: 'search',
                    },
                    props: true,
                    component: CloudServiceTypeSearch,
                },
                {
                    path: 'no-resource',
                    name: 'noCloudService',
                    component: NoResource,
                },
                {
                    path: ':provider/:group/:name',
                    props: true,
                    meta: {
                        label: 'Cloud Service',
                    },
                    component: { template: '<router-view />' },
                    children: [
                        {
                            path: '/',
                            name: 'cloudServicePage',
                            props: true,
                            component: CloudServicePage,
                        },
                    ],
                },
            ],

        },
    ],
} as RouteConfig;