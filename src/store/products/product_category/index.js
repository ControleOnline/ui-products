import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    offline: true,
    item: {},
    items: [],
    resourceEndpoint: 'product_categories',
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
        editable: false,
        isIdentity: true,
        name: 'id',
        label: 'id',
      },
      {
        sortable: true,
        editable: false,
        name: 'category',
        label: 'category',
        format(value) {
          return value?.name || '';
        },
      },
      {
        sortable: true,
        editable: false,
        name: 'product',
        sortField: 'product.product',
        label: 'product',
        format(value) {
          return value?.product || '';
        },
      },
      {
        sortable: true,
        editable: true,
        inputType: 'number',
        name: 'sortOrder',
        label: 'sortOrder',
        defaultSort: 'ASC',
        format(value) {
          return value ?? '';
        },
        saveFormat(value) {
          return value === '' || value === null || value === undefined
            ? null
            : Number(value);
        },
      },
    ],
  },
  actions,
  getters,
  mutations,
};
