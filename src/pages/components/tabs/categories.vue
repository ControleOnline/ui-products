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
    tick-strategy="leaf"
    default-expand-all
    v-model:ticked="selectedCategories"
  />
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  data() {
    return {
      linkedData: [],
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
    linkObj: {
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

  created() {
    this.buildCategoryTree();
    let filters = { context: this.context, company: this.company.id };
    this.$store.commit(this.configs.store + "/SET_FILTERS", filters);
  },
  methods: {
    ...mapActions({
      getCategories: "categories/getItems",
    }),
    saved() {
      this.buildCategoryTree();
    },
    removeLinkedCategory(categoryIds) {
      categoryIds.forEach((categoryId, i) => {
        let obj =
          this.linkedData.find((data) => {
            return data.category.replace(/\D/g, "") == categoryId;
          }) || {};

        if (obj && obj["@id"])
          this.$store.dispatch(
            this.linkConfigs.store + "/remove",
            obj["@id"].replace(/\D/g, "")
          );
      });
    },
    addLinkedCategory(categoryIds) {
      let obj = this.linkObj;
      categoryIds.forEach((categoryId, i) => {
        this.$store.dispatch(this.linkConfigs.store + "/save", {
          category: "/categories/" + categoryId,
          ...obj,
        });
      });
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
        this.linkedData = selectedCategories;

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
                this.selectedCategories.push(category.id);
            });
          });
          this.categoryTree = roots;
        });
      });
    },
  },
  watch: {
    selectedCategories: {
      handler: function (selectedCategories, oldSelectedCategories) {
        if (selectedCategories.length > oldSelectedCategories.length) {
          const categoryIds = selectedCategories.filter(
            (id) => !oldSelectedCategories.includes(id)
          );
          this.addLinkedCategory(categoryIds);
        } else if (selectedCategories.length < oldSelectedCategories.length) {
          const categoryIds = oldSelectedCategories.filter(
            (id) => !selectedCategories.includes(id)
          );
          this.removeLinkedCategory(categoryIds);
        }
      },
      deep: true,
    },
  },
};
</script>

<style scoped>
/* Estilos adicionais, se necessário */
</style>
