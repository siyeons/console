<template>
    <section class="event-list-wrapper">
        <p-toolbox
            search-type="plain"
            :total-count="totalCount"
            :page-size-changeable="false"
            :pagination-visible="false"
            class="mb-4"
            @change="onChange"
            @refresh="onChange()"
        />
        <template v-for="(item, idx) in itemList">
            <alert-detail-vertical-timeline :key="item.event_id" :item="item" :timezone="timezone"
                                            class="timeline"
            >
                <template #timeline-detail>
                    <div class="title" @click="onOpenModal(item)">
                        <span class="severity">[{{ item.severity }}]</span> {{ item.title }}
                        <p-i name="ic_arrow_right" width="0.8em" height="0.8em"
                             color="inherit"
                        />
                    </div>
                    {{ item.description }}
                </template>
            </alert-detail-vertical-timeline>
        </template>
        <p-button v-if="itemList.length > 9" size="md"
                  style-type="primary-dark outline"
                  class="more-button"
                  @click="onClickMore"
        >
            {{ $t('MONITORING.ALERT.DETAIL.EVENT_LIST.MORE') }}
        </p-button>
        <p-button-modal
            v-if="modalVisible"
            :header-title="$t('MONITORING.ALERT.DETAIL.EVENT_LIST.EVENT_DETAILS')"
            size="md"
            :visible.sync="modalVisible"
            @confirm="onClickConfirm"
        >
            <template #body>
                <div class="content-wrapper">
                    <p-raw-data :item="selectedItem.raw_data" class="code-block" />
                </div>
            </template>
            <template #footer-extra>
                <p-button
                    style-type="gray-border"
                    @click="onCopyClick"
                >
                    <p-i name="ic_copy" width="1em" height="1em"
                         color="inherit transparent" class="mr-2"
                    />
                    {{ $t('MONITORING.ALERT.DETAIL.EVENT_LIST.COPY_ALL') }}
                </p-button>
            </template>
        </p-button-modal>
    </section>
</template>

<script lang="ts">
import { SpaceConnector } from '@spaceone/console-core-lib/space-connector';
import { ApiQueryHelper } from '@spaceone/console-core-lib/space-connector/helper';
import {
    ComponentRenderProxy, computed, getCurrentInstance, reactive, toRefs,
} from '@vue/composition-api';
import { store } from '@/store';
import { QueryHelper } from '@spaceone/console-core-lib/query';
import AlertDetailVerticalTimeline
    from '@/views/monitoring/alert-manager/modules/alert-detail/AlertDetailVerticalTimeline.vue';
import { Event } from '@/views/monitoring/alert-manager/type';
import {
    PButton, PButtonModal, PI, PRawData, PToolbox,
} from '@spaceone/design-system';
import { copyAnyData } from '@/lib/helper/copy-helper';

const PAGE_SIZE = 10;

export default {
    name: 'AlertDetailEventList',
    components: {
        AlertDetailVerticalTimeline,
        PToolbox,
        PButton,
        PButtonModal,
        PRawData,
        PI,
    },
    props: {
        id: {
            type: String,
            default: '',
        },
    },
    setup(props) {
        const eventListApiQueryHelper = new ApiQueryHelper()
            .setSort('created_at', true)
            .setPage(1, 10);
        let eventListApiQuery = eventListApiQueryHelper.data;

        const state = reactive({
            itemList: [] as Event[],
            timezone: computed(() => store.state.user.timezone),
            totalCount: 0,
            thisPage: 1,
            pageLimit: 10,
            selectedItem: {} as any,
            modalVisible: false,
        });

        const searchQueryHelper = new QueryHelper();

        const listEvent = async () => {
            eventListApiQueryHelper.setFilters([...searchQueryHelper.filters]);
            if (props.id) eventListApiQueryHelper.addFilter({ k: 'alert_id', v: props.id, o: '=' });
            eventListApiQuery = eventListApiQueryHelper.data;
            const { results, total_count } = await SpaceConnector.client.monitoring.event.list({ query: eventListApiQuery });
            state.itemList = results;
            state.totalCount = total_count;
        };

        const onChange = async (options: any = {}) => {
            if (options.searchText !== undefined) {
                eventListApiQueryHelper.setPageStart(1);
                eventListApiQueryHelper.setPageLimit(10);
                searchQueryHelper.setFilters([{ v: options.searchText }]);
            }
            await listEvent();
        };

        const onClickMore = async () => {
            state.thisPage += 1;
            state.pageLimit = state.thisPage * PAGE_SIZE;
            eventListApiQueryHelper.setPageLimit(state.pageLimit);
            await listEvent();
        };

        const onOpenModal = (item) => {
            state.modalVisible = true;
            state.selectedItem = item;
        };

        const onClickConfirm = () => {
            state.modalVisible = false;
        };

        const onCopyClick = () => {
            copyAnyData(state.selectedItem.raw_data);
        };

        (async () => {
            await listEvent();
        })();

        return {
            ...toRefs(state),
            onChange,
            onClickMore,
            onOpenModal,
            onClickConfirm,
            onCopyClick,
        };
    },
};
</script>

<style lang="postcss" scoped>
.event-list-wrapper {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    padding-bottom: 2.5rem;
}
.title {
    &:hover {
        @apply text-blue-500 cursor-pointer underline;
    }
}
.severity {
    @apply font-bold capitalize;
}
.more-button {
    display: flex;
    width: 100%;
    margin-top: 1.5rem;
}
.content-wrapper {
    max-height: 20.68rem;
}
</style>
