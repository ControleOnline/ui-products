<template>
  <DefaultTable :configs="configs" v-if="loaded" />
</template>
<script>
import { mapActions, mapGetters } from "vuex";
import SelectInput from "@controleonline/quasar-default-ui/src/components/Default/Common/Inputs/SelectInput.vue";
import DefaultTable from "@controleonline/quasar-default-ui/src/components/Default/DefaultTable";
import product_feed_stock from "./product_feed_stock.vue";

export default {
  components: {
    DefaultTable,
    SelectInput,
  },
  props: {
    products: {
      required: true,
    },
    productGroup: {
      required: true,
    },
    ProductId: {
      required: true,
    },
  },
  computed: {
    ...mapGetters({
      myCompany: "people/currentCompany",
    }),
    configs() {
      return {
        "full-height": false,
        filters: true,
        store: "product_group_product",
        selection: false,
        search: {},
        components: {
          tableActions: {
            component: product_feed_stock,
            props: {
              productGroup: this.productGroup,
            },
          },
        },
      };
    },
    filters() {
      return this.$copyObject(
        this.$store.getters[this.configs.store + "/filters"]
      );
    },
  },
  data() {
    return {
      loaded: false,
    };
  },

  methods: {
    ...mapActions({}),
  },
  watch: {},
  created() {
    let filters = this.$copyObject(this.filters);
    filters.product = "/products/" + this.ProductId;
    filters.productGroup = this.productGroup;
    filters.productType = "component";
    this.$store.commit(this.configs.store + "/SET_FILTERS", filters);
    this.loaded = true;
  },
};
</script>