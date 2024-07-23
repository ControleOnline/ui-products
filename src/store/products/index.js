import * as actions from "@controleonline/quasar-default-ui/src/store/default/actions";
import * as getters from "@controleonline/quasar-default-ui/src/store/default/getters";
import mutations from "@controleonline/quasar-default-ui/src/store/default/mutations";
import Formatter from "@controleonline/ui-common/src/utils/formatter.js";

export default {
  namespaced: true,
  state: {
    resourceEndpoint: "products",
    isLoading: false,
    error: "",
    violations: null,
    totalItems: 0,
    filters: {},
    columns: [
      {
        sortable: true,
        name: "id",
        align: "left",
        label: "id",
        sum: false,
        isIdentity: true,
        to: function (value) {
          return {
            name: "ProductDetails",
            params: { id: value },
          };
        },
        format: function (value) {
          return "#" + value;
        },
      },
      {
        sortable: true,
        name: "sku",
        externalFilter: true,
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
        name: "product",
        externalFilter: true,
        align: "left",
        label: "product",
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        name: "description",
        externalFilter: true,
        align: "left",
        label: "description",
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        externalFilter: true,
        name: "productUnit",
        align: "left",
        list: "product_unit/getItems",
        label: "productUnit",
        format: function (value) {
          return value?.productUnit;
        },
        formatList: function (value) {
          if (value)
            return {
              value: value["@id"]?.split("/").pop(),
              label: value.productUnit,
            };
        },
        saveFormat: function (value) {
          return value ? "/product_unities/" + (value.value || value) : null;
        },
      },

      {
        sortable: true,
        externalFilter: true,
        name: "type",
        align: "left",
        list: [
          { value: "product", label: "Produto" },
          { value: "service", label: "Serviço" },
          { value: "component", label: "Componente" },
          { value: "feedstock", label: "Matéria Prima" },
          { value: "package", label: "Embalagem" },
        ],
        label: "type",
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        name: "productCondition",
        externalFilter: true,
        list: [
          { value: "new", label: "Novo" },
          { value: "used", label: "Usado" },
          { value: "recondicioned", label: "Recondicionado" },
        ],
        align: "left",
        label: "productCondition",
        format: function (value) {
          return value;
        },
      },
      {
        sortable: true,
        name: "price",
        align: "right",
        label: "price",
        sum: true,
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
