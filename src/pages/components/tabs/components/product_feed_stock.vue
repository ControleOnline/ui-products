<template>
  <q-btn
    dense
    icon="info"
    v-if="1 == 1 || row.productChild.type != 'feedstock'"
    class="btn-primary"
    @click="openModal"
  >
    <q-tooltip>
      {{ $tt(configs.store, "tooltip", "feedstock") }}
    </q-tooltip>
  </q-btn>

  <q-dialog v-model="modalVisible" full-height full-width>
    <DefaultTable :configs="configs" />
  </q-dialog>
</template>
<script>
import { mapActions, mapGetters } from "vuex";
import SelectInput from "@controleonline/ui-default/src/components/Default/Common/Inputs/SelectInput.vue";


export default {
  components: {
    
    SelectInput,
  },
  props: {
    row: {
      required: true,
    },
    componentProps: {
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
        store: "product_group_feedstock",
        selection: false,
        search: {},
        columns: {
          productChild: {
            filters: { type: ["feedstock"] },
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
      modalVisible: false,
    };
  },

  methods: {
    ...mapActions({}),
    openModal() {
      let filters = this.$copyObject(this.filters);
      filters.product = this.row.productChild["@id"];
      filters.productGroup = this.componentProps.productGroup;
      filters.productType = "feedstock";
      this.$store.commit(this.configs.store + "/SET_FILTERS", filters);
      this.modalVisible = true;
    },
  },
  watch: {},
  created() {},
};
</script>
