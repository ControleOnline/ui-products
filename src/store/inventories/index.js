import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    offline: true,
    item: {},
    items: [],
    resourceEndpoint: 'inventories',
    isLoading: false,
    error: '',
    totalItems: 0,
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
          return value || '';
        },
        saveFormat: function (value) {
          return value || '';
        },
      },
      {
        sortable: true,
        name: 'type',
        align: 'left',
        label: 'type',
        list: [
          { value: 'default', label: 'Default' },
          { value: 'warehouse', label: 'Warehouse' },
        ],
        format: function (value) {
          return value || '';
        },
        saveFormat: function (value) {
          return value || '';
        },
      },
      {
        sortable: true,
        name: 'people',
        align: 'left',
        label: 'people',
        list: 'people/getItems',
        format: function (value) {
          return value?.name || '';
        },
        saveFormat: function (value) {
          return value ? '/people/' + (value.value || value) : null;
        },
      },
    ],
  },
  actions,
  getters,
  mutations,
};
