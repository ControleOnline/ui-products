import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    offline: false,
    item: {},
    items: [],
    resourceEndpoint: 'product_inventories',
    isLoading: false,
    error: '',
    totalItems: 0,
    summary: {},
    messages: [],
    message: {},
    filters: {},
    columns: [
      {
        sortable: true,
        name: 'id',
        align: 'left',
        label: 'id',
        isIdentity: true,
        format: function (value) {
          return '#' + value;
        },
      },
      {
        sortable: true,
        name: 'inventory',
        align: 'left',
        label: 'inventory',
        format: function (value) {
          return value?.inventory || '';
        },
        saveFormat: function (value) {
          return value ? '/inventories/' + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        name: 'product',
        align: 'left',
        label: 'product',
        format: function (value) {
          return value?.product || '';
        },
        saveFormat: function (value) {
          return value ? '/products/' + (value.value || value) : null;
        },
      },
      {
        sortable: true,
        name: 'available',
        align: 'right',
        label: 'available',
        format: function (value) {
          return value ?? 0;
        },
      },
      {
        sortable: true,
        name: 'minimum',
        align: 'right',
        label: 'minimum',
        format: function (value) {
          return value ?? 0;
        },
      },
      {
        sortable: true,
        name: 'maximum',
        align: 'right',
        label: 'maximum',
        format: function (value) {
          return value ?? 0;
        },
      },
    ],
  },
  actions,
  getters,
  mutations,
};
