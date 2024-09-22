<template>
  <q-page padding>
    <!-- Campo de entrada com ícone de pesquisa -->
    <div>
      <q-input
        v-model="input"
        outlined
        placeholder="Digite o nome da máquina"
        prepend-icon="search"
        clearable
      ></q-input>
    </div>

    <!-- Detalhes da Máquina -->
    <q-card flat bordered class="q-pa-md" v-if="input.length > 3">
      <q-card-section>
        <div class="text-h6">Detalhes da Máquina</div>
        <div class="q-mt-md">
          <q-item>
            <q-item-section>
              <div><strong>Modelo:</strong> {{ maquina.modelo }}</div>
              <div><strong>Fabricante:</strong> {{ maquina.fabricante }}</div>
              <div><strong>País de Origem:</strong> {{ maquina.paisOrigem }}</div>
            </q-item-section>
          </q-item>
        </div>
      </q-card-section>
    </q-card>

    <!-- Abas com mais detalhes -->
    <q-tabs v-model="abaAtiva" class="q-mt-md" align="left" dense v-if="input.length > 3">
      <q-tab name="pecas" label="Peças de Reposição" />
      <q-tab name="ultimasPecas" label="Últimas Peças Trocadas" />
      <q-tab name="fornecedores" label="Principais Fornecedores" />
    </q-tabs>

    <q-tab-panels v-model="abaAtiva" animated v-if="input.length > 3">
      <!-- Aba de Peças de Reposição -->
      <q-tab-panel name="pecas">
        <q-card flat bordered class="q-pa-md q-mt-md">
          <q-card-section>
            <div class="text-h6">Principais Peças de Reposição</div>
            <q-list bordered separator>
              <q-item v-for="peca in pecasReposicao" :key="peca.id">
                <q-item-section>{{ peca.nome }}</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Aba de Últimas Peças Trocadas -->
      <q-tab-panel name="ultimasPecas">
        <q-card flat bordered class="q-pa-md q-mt-md">
          <q-card-section>
            <div class="text-h6">Últimas Peças Trocadas</div>
            <q-list bordered separator>
              <q-item v-for="peca in ultimasPecasTrocadas" :key="peca.id">
                <q-item-section>{{ peca.nome }} ({{ peca.dataTroca }})</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Aba de Fornecedores -->
      <q-tab-panel name="fornecedores">
        <q-card flat bordered class="q-pa-md q-mt-md">
          <q-card-section>
            <div class="text-h6">Principais Fornecedores</div>
            <q-list bordered separator>
              <q-item v-for="fornecedor in fornecedores" :key="fornecedor.id">
                <q-item-section>{{ fornecedor.nome }}</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script>
export default {
  data() {
    return {
      input: ``,
      abaAtiva: "pecas",
      maquina: {
        modelo: "MX-200",
        fabricante: "Fabricante X",
        paisOrigem: "Alemanha",
      },
      pecasReposicao: [
        { id: 1, nome: "Peça A" },
        { id: 2, nome: "Peça B" },
        { id: 3, nome: "Peça C" },
      ],
      ultimasPecasTrocadas: [
        { id: 1, nome: "Peça D", dataTroca: "01/09/2023" },
        { id: 2, nome: "Peça E", dataTroca: "15/08/2023" },
      ],
      fornecedores: [
        { id: 1, nome: "Fornecedor X" },
        { id: 2, nome: "Fornecedor Y" },
      ],
    };
  },
};
</script>

<style scoped>
.q-pa-md {
  padding: 16px;
}
</style>
