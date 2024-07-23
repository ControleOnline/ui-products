import * as actions from "@controleonline/ui-default/src/store/default/actions";
import * as getters from "@controleonline/ui-default/src/store/default/getters";
import mutations from "@controleonline/ui-default/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";

export default {
  namespaced: true,
  state: {
    resourceEndpoint: "product_group_products",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
    filters: {},
    columns: [
      {
        sortable: true,
        editable: false,
        name: "id",
        align: "left",
        label: "id",
        sum: false,
        isIdentity: true,
        format: function (value) {
          return "#" + value;
        },
      },
      {
        sortable: true,
        name: "sku",
        externalFilter: false,
        editable: false,
        align: "left",
        label: "sku",
        sum: false,
        saveFormat(value) {
          return value + "";
        },
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        name: "productChild",
        externalFilter: false,
        editable: false,
        align: "left",
        label: "productChild",
        list: "products/getItems",
        saveFormat(value, column, row) {
          return "/products/" + value.value;
        },
        formatList(value, column, row) {
          return { value: value["@id"].split("/").pop(), label: value.product };
        },

        format: function (value) {
          return value.product;
        },
      },
      {
        sortable: true,
        name: "price",
        align: "right",
        label: "price",
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
      
    ],
  },
  actions,
  getters,
  mutations,
};
