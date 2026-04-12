import * as actions from '@controleonline/ui-default/src/store/default/actions';
import * as getters from '@controleonline/ui-default/src/store/default/getters';
import mutations from '@controleonline/ui-default/src/store/default/mutations';

export default {
  namespaced: true,
  state: {
    offline: true,
    item: {},
    items: [],
    resourceEndpoint: 'product_people',
    isLoading: false,
    error: '',
    totalItems: 0,
    summary: {},
    messages: [],
    message: {},
    filters: {},
    columns: [],
  },
  actions,
  getters,
  mutations,
};
