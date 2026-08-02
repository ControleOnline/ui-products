import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';
import Formatter from '@controleonline/ui-common/src/utils/formatter.js';

export default {
  namespaced: true,
  state: {
    offline: true,
    item: {},
    items: [],
    resourceEndpoint: 'product_group_products',
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
        name: 'id',
        align: 'left',
        label: 'id',
        sum: false,
        isIdentity: true,
        format: function (value) {
          return '#' + value;
        },
      },
      {
        sortable: true,
        name: 'sku',
        externalFilter: false,
        editable: false,
        align: 'left',
        label: 'sku',
        sum: false,
        saveFormat(value) {
          return value + '';
        },
        format: function (value) {
          return value;
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
      {
        sortable: true,
        name: 'productChild',
        externalFilter: false,
        searchParam: 'product',
        editable: false,
        align: 'left',
        label: 'productChild',
        list: 'products/getItems',
        saveFormat(value) {
          return '/products/' + value.value;
        },

        format: function (value) {
          return value.product;
        },
      },
      {
        sortable: true,
        name: 'price',
        align: 'right',
        label: 'price',
        sum: false,
        editFormat(value) {
          return Formatter.formatMoney(value);
        },
        saveFormat(value) {
          return Formatter.formatFloat(value);
        },
        format(value) {
          return Formatter.formatMoney(value);
        },
      },
      {
        sortable: true,
        name: 'showInParentQueue',
        externalFilter: false,
        align: 'left',
        label: 'showInParentQueue',
        list: [
          { value: true, label: 'Sim' },
          { value: false, label: 'Nao' },
        ],
        format: function (value) {
          return value === false ? 'Nao' : 'Sim';
        },
        saveFormat: function (value) {
          return value !== false;
        },
      },
    ],
  },
  actions,
  getters,
  mutations,
};
