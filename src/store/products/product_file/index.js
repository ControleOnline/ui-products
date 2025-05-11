import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";

export default {
  namespaced: true,
  state: {
    offline: true,
    item: {},
    items: [],
    resourceEndpoint: "product_files",
    isLoading: false,
    error: "",
    
    totalItems: 0,messages:[], message:{},
    filters: {},
    columns: [],
  },
  actions,
  getters,
  mutations,
};
