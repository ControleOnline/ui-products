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
      <!--<DefaultForm :configs="configs" :data="product" v-if="product" />-->
      <div class="row q-col-gutter-md">
        <!-- SKU -->
        <div class="col-12 col-md-4">
          <DefaultInput
            :columnName="'sku'"
            :row="product"
            :configs="configs"
            @saved="getData"
            @loadData="loadData"
          />
        </div>

        <!-- Produto -->
        <div class="col-12 col-md-4">
          <DefaultInput
            :columnName="'product'"
            :row="product"
            :configs="configs"
            @saved="getData"
            @loadData="loadData"
          />
        </div>

        <!-- Descrição -->
        <div class="col-12 col-md-4">
          <DefaultInput
            :columnName="'description'"
            :row="product"
            :configs="configs"
            @saved="getData"
            @loadData="loadData"
          />
        </div>

        <!-- Unidade do Produto -->
        <div class="col-12 col-md-4">
          <DefaultInput
            :columnName="'productUnit'"
            :row="product"
            :configs="configs"
            @saved="getData"
            @loadData="loadData"
          />
        </div>

        <!-- Tipo -->
        <div class="col-12 col-md-4">
          <DefaultInput
            :columnName="'type'"
            :row="product"
            :configs="configs"
            @saved="getData"
            @loadData="loadData"
          />
        </div>

        <!-- Condição do Produto -->
        <div class="col-12 col-md-4">
          <DefaultInput
            :columnName="'productCondition'"
            :row="product"
            :configs="configs"
            @saved="getData"
            @loadData="loadData"
          />
        </div>

        <!-- Preço -->
        <div class="col-12 col-md-4">
          <DefaultInput
            :columnName="'price'"
            :row="product"
            :configs="configs"
            @saved="getData"
            @loadData="loadData"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";

import Imagens from "./imagens";

export default {
  components: {
    Imagens,
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
      myCompany: "people/currentCompany",
    }),
    configs() {
      return {
        store: "products",
        showLabels: false,
        labelType:'dense',
        columns: {
          queue: {
            filters: {
              company: this.myCompany.id,
            },
          },
        },
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
