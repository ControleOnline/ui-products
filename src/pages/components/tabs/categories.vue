<template>
  <DefaultButtonDialog
    v-if="configs.editable != false"
    :configs="{
      icon: 'add',
      store: configs.store,
      label: 'add',
      component: this.$components.DefaultForm,
      componentConfigs: configs,
    }"
    @saved="saved"
    @error="error"
  />

  <q-tree
    :nodes="categoryTree"
    node-key="value"
    tick-strategy="strict"
    default-expand-all
    v-model:selected="selectedCategories"
    @update:selected="getNode"
  />
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  data() {
    return {
      selectedCategories: [],
      categoryTree: [],
    };
  },
  props: {
    context: {
      required: true,
    },
    company: {
      required: true,
    },
    linkConfigs: {
      required: true,
    },
  },
  computed: {
    configs() {
      return {
        filters: true,
        store: "categories",
        selection: false,
        search: {},
        components: {},
        columns: {
          parent: {
            filters: {
              context: this.context,
              company: this.company.id,
            },
          },
        },
      };
    },
  },
  methods: {
    ...mapActions({
      getCategories: "categories/getItems",
    }),
    saved() {
      this.buildCategoryTree();
    },
    async buildSelected() {
      return await this.$store.dispatch(
        this.linkConfigs.store + "/getItems",
        this.linkConfigs.filters
      );
    },
    buildCategoryTree() {
      const map = {};
      const roots = [];
      this.buildSelected().then((selectedCategories) => {
        this.getCategories({
          context: this.context,
          company: this.company.id,
        }).then((result) => {
          result.forEach((category) => {
            map[category.id] = {
              value: category.id,
              label: category.name,
              icon: category.icon,
              children: [],
            };

            if (category.parent) {
              if (!map[category.parent.id]) {
                map[category.parent.id] = { children: [] };
              }
              map[category.parent.id].children.push(map[category.id]);
            } else {
              roots.push(map[category.id]);
            }

            selectedCategories.some((item) => {
              if (item.category === category["@id"])
                this.selectedCategories.push({
                  value: category.id,
                  label: category.name,
                });
            });
          });
          this.categoryTree = roots;

          console.log(this.selectedCategories);
        });
      });
    },
    getNode(node) {
      console.log(node);
    },
  },
  created() {
    this.buildCategoryTree();
    let filters = { context: this.context, company: this.company.id };
    this.$store.commit(this.configs.store + "/SET_FILTERS", filters);
  },
};
</script>

<style scoped>
/* Estilos adicionais, se necessário */
</style>
