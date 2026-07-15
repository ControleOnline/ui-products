import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    offline: true,
    item: {},
    items: [],
    resourceEndpoint: 'product_groups',
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
        sum: false,
        isIdentity: true,
        format: function (value) {
          return '#' + value;
        },
      },
      {
        sortable: true,
        name: 'productGroup',
        externalFilter: false,
        align: 'left',
        label: 'productGroup',
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        name: 'priceCalculation',
        externalFilter: false,
        editable: false,
        align: 'left',
        label: 'priceCalculation',
        list: [
          {
            value: 'sum',
            label: 'Soma',
          },
          {
            value: 'average',
            label: 'Média',
          },
          {
            value: 'biggest',
            label: 'Maior',
          },
          {
            value: 'free',
            label: 'Brinde',
          },
        ],
        saveFormat(value, column, row) {
          return value?.value;
        },
      },
      {
        inputType: 'increase',
        sortable: true,
        editable: true,
        name: 'minimum',
        label: 'minimum',
        align: 'left',
        format(value, column, row) {
          return parseFloat(value);
        },
      },
      {
        inputType: 'increase',
        sortable: true,
        editable: true,
        name: 'maximum',
        label: 'maximum',
        align: 'left',
        format(value, column, row) {
          return parseFloat(value);
        },
      },
    ],
  },
  actions,
  getters,
  mutations,
};
