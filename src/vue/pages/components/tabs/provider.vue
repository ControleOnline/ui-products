<template>
  <div class="row col-12">
    <div class="col-12">
      <q-card flat bordered class="bg-white">
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="text-h6">Fornecedores</div>
            <div class="text-caption text-grey-7">
              {{
                relations.length === 1
                  ? "1 relacionamento com este produto"
                  : `${relations.length} relacionamentos com este produto`
              }}
            </div>
          </div>

          <q-badge color="primary" outline>
            {{ relations.length }}
          </q-badge>
        </q-card-section>

        <q-separator />

        <q-list v-if="relations.length > 0" separator>
          <q-item
            v-for="relation in relations"
            :key="relation.id || `${relation.people?.id || 'people'}-${relation.priority || 0}`"
            clickable
            @click="openProvider(relation)"
          >
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white" icon="storefront" />
            </q-item-section>

            <q-item-section>
              <q-item-label>
                {{ personName(relation.people) }}
              </q-item-label>
              <q-item-label caption>
                {{ personSubtitle(relation.people) }}
              </q-item-label>

              <div class="q-mt-sm row q-col-gutter-sm">
                <div class="col-auto">
                  <q-chip dense color="blue-1" text-color="primary">
                    {{ roleLabel(relation.role) }}
                  </q-chip>
                </div>

                <div
                  v-for="item in relationMeta(relation)"
                  :key="`${relation.id}-${item.label}`"
                  class="col-auto"
                >
                  <q-chip dense color="grey-2" text-color="grey-9">
                    {{ item.label }}: {{ item.value }}
                  </q-chip>
                </div>
              </div>
            </q-item-section>

            <q-item-section side>
              <q-icon name="chevron_right" color="grey-5" />
            </q-item-section>
          </q-item>
        </q-list>

        <q-card-section v-else class="text-grey-7 text-center q-py-xl">
          Nenhum fornecedor vinculado a este produto.
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";

const ROLE_LABELS = {
  supplier: "Fornecedor",
  manufacturer: "Fabricante",
  distributor: "Distribuidor",
};

export default {
  props: {
    ProductId: {
      required: true,
    },
  },
  data() {
    return {
      product: null,
    };
  },
  computed: {
    relations() {
      const safeRelations = Array.isArray(this.product?.productPeople)
        ? [...this.product.productPeople]
        : [];

      return safeRelations.sort((left, right) => {
        const leftPriority = Number(left?.priority ?? 9999);
        const rightPriority = Number(right?.priority ?? 9999);

        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }

        return this.personName(left?.people)
          .toLowerCase()
          .localeCompare(this.personName(right?.people).toLowerCase());
      });
    },
  },
  created() {
    this.loadProduct();
  },
  watch: {
    ProductId() {
      this.loadProduct();
    },
  },
  methods: {
    ...mapActions({
      getProduct: "products/get",
    }),
    loadProduct() {
      if (!this.ProductId) {
        this.product = null;
        return;
      }

      this.getProduct(this.ProductId).then((product) => {
        this.product = product;
      });
    },
    roleLabel(role) {
      return ROLE_LABELS[role] || role || "Relacionamento";
    },
    personName(person) {
      return String(person?.alias || person?.name || `Pessoa #${person?.id || ""}`).trim();
    },
    personSubtitle(person) {
      const items = [];

      if (person?.name && person?.alias && person.name !== person.alias) {
        items.push(String(person.name).trim());
      }

      if (person?.peopleType) {
        items.push(person.peopleType === "J" ? "Pessoa juridica" : "Pessoa fisica");
      }

      return items.join(" | ");
    },
    formatMoney(value) {
      if (value === null || value === undefined || value === "") {
        return "";
      }

      const parsed = Number(String(value).replace(",", "."));
      if (!Number.isFinite(parsed)) {
        return String(value);
      }

      try {
        return parsed.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      } catch (error) {
        return `R$ ${parsed.toFixed(2)}`;
      }
    },
    relationMeta(relation) {
      const items = [];

      if (relation?.supplierSku) {
        items.push({ label: "Cod. fornecedor", value: relation.supplierSku });
      }

      if (relation?.costPrice) {
        items.push({ label: "Custo", value: this.formatMoney(relation.costPrice) });
      }

      if (relation?.leadTimeDays || relation?.leadTimeDays === 0) {
        items.push({
          label: "Prazo",
          value: `${relation.leadTimeDays} ${
            Number(relation.leadTimeDays) === 1 ? "dia" : "dias"
          }`,
        });
      }

      if (relation?.priority || relation?.priority === 0) {
        items.push({ label: "Prioridade", value: String(relation.priority) });
      }

      return items;
    },
    openProvider(relation) {
      const providerId = relation?.people?.id;
      if (!providerId) {
        return;
      }

      this.$router.push({
        name: "ProviderDetails",
        params: {
          id: providerId,
        },
      });
    },
  },
};
</script>
