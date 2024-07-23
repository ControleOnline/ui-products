<template>
  <div class="row col-12" v-if="product">
    <div
      v-if="product.id"
      class="row col-xs-12 col-sm-12 col-md-4 col-lg-4 col-xl-4 justify-content q-pa-sm"
    >
      <Imagens :product="product" />
    </div>
    <div
      :class="
        (product.id
          ? 'col-md-8 col-lg-8 col-xl-8'
          : 'col-md-12 col-lg-12 col-xl-12') +
        ' row col-xs-12 col-sm-12 justify-content q-pa-sm'
      "
    >
      <DefaultForm :configs="configs" :data="product" v-if="product" />
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import DefaultForm from "@controleonline/ui-default/src/components/Default/Common/DefaultForm.vue";

import Imagens from "./imagens";

export default {
  components: {
    Imagens,
    DefaultForm,
  },
  props: {
    ProductId: {
      required: false,
    },
  },
  data() {
    return {
      product: null,
      productType: [
        { label: this.$t("product.product"), value: "product" },
        { label: this.$t("product.service"), value: "service" },
        { label: this.$t("product.component"), value: "component" },
      ],
      productConditions: [
        { label: this.$t("product.new"), value: "new" },
        { label: this.$t("product.used"), value: "used" },
        { label: this.$t("product.recondicioned"), value: "recondicioned" },
      ],
      loaded: false,
    };
  },
  created() {
    this.getData();
  },

  computed: {
    ...mapGetters({
      isLoading: "products/isLoading",
    }),
    configs() {
      return {
        store: "products",
      };
    },
  },
  methods: {
    ...mapActions({
      saveProduct: "products/save",
      getProduct: "products/get",
    }),
    getData() {
      if (this.ProductId)
        this.getProduct(this.ProductId).then((data) => {
          this.product = data;
        });
    },
  },
  watch: {},
};
</script>
