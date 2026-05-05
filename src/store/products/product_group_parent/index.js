import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    offline: true,
    item: {},
    items: [],
    resourceEndpoint: 'product_group_parents',
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
      },
      {
        sortable: true,
        name: 'parentProduct',
        externalFilter: false,
        align: 'left',
        label: 'parentProduct',
      },
    ],
  },
  actions,
  getters,
  mutations,
};
