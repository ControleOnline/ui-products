import React from 'react';
import { View, ScrollView, TextInput, Text, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StateStore from '@controleonline/ui-common/src/react/components/StateStore';
import DefaultUpload from '@controleonline/ui-default/src/react/components/upload/DefaultUpload';
import styles, {
  inlineStyle_545_10,
  inlineStyle_673_18,
  inlineStyle_675_20,
  inlineStyle_92_14,
} from './ProductForm.styles';
import {
  SkeletonTab,
  SelectField,
  CategoryMultiSelectField,
  SectionCard,
} from './ProductFormFields';

export default function ProductFormView({
  product, productsStore, categoriesStore, actionStatus, entityLabels, openSections,
  errorSections, toggleSection, handleChange, brandColors, selectedCategoryIds,
  setSelectedCategoryIds, categoryGetters, extractCategoryIdValue, getContextTypes,
  fmtN, productUnitOptions, productUnitLabel, productUnitPlaceholder, productUnitHelperText,
  isServiceProduct, queuesGetters, inventoriesGetters, controlarEstoque, setControlarEstoque,
  switchPalette, buttonPalette, ProductId, currentCompany, saveProductCover, reloadProduct,
  handleSave,
}) {
  if (!product) return (
    <View style={inlineStyle_545_10}>
      <SkeletonTab />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {!productsStore.getters?.isLoading && <StateStore store="products" />}
      {!categoriesStore.getters?.isLoading && <StateStore store="categories" />}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {!!actionStatus && (
          <View style={[
            styles.statusBanner,
              actionStatus === entityLabels.saveSuccess ? styles.statusBannerSuccess : styles.statusBannerError,
          ]}>
            <MaterialCommunityIcons
              name={actionStatus === entityLabels.saveSuccess ? 'check-circle-outline' : 'alert-circle-outline'}
              size={16}
              color={actionStatus === entityLabels.saveSuccess ? '#166534' : '#9e1b1b'}
            />
            <Text style={[
              styles.statusBannerText,
              actionStatus === entityLabels.saveSuccess ? { color: '#166534' } : { color: '#9e1b1b' },
            ]}>{actionStatus}</Text>
          </View>
        )}

        {/* Seção: Identificação */}
        <SectionCard title="Identificação" icon="tag-outline" isOpen={openSections.has('identificacao')} hasError={errorSections.has('identificacao')} onToggle={() => toggleSection('identificacao')}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Nome *</Text>
            <TextInput
              value={String(product.product || '')}
              onChangeText={val => handleChange('product', val)}
              style={styles.textInput}
              placeholder={entityLabels.namePlaceholder}
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Descrição</Text>
            <TextInput
              value={String(product.description || '')}
              onChangeText={val => handleChange('description', val)}
              multiline
              style={styles.textInputMultiline}
              placeholder={entityLabels.descriptionPlaceholder}
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>SKU</Text>
            <TextInput
              value={String(product.sku || '')}
              onChangeText={val => handleChange('sku', val)}
              style={styles.textInput}
              placeholder="SKU"
              placeholderTextColor="#CBD5E1"
            />
          </View>
        </SectionCard>

        {/* Seção: Preço e Classificação */}
        <SectionCard title="Preço e Classificação" icon="currency-usd" isOpen={openSections.has('preco')} hasError={errorSections.has('preco')} onToggle={() => toggleSection('preco')}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Preço (R$) *</Text>
            <TextInput
              value={fmtN(product.price)}
              onChangeText={val => handleChange('price', val)}
              keyboardType="numeric"
              style={styles.textInput}
              placeholder="0,00"
              placeholderTextColor="#CBD5E1"
            />
          </View>
          <CategoryMultiSelectField
            label="Categorias"
            values={selectedCategoryIds}
            onChange={setSelectedCategoryIds}
            brandColors={brandColors}
            options={(categoryGetters.items || [])
              .map(opt => ({ value: extractCategoryIdValue(opt.id || opt['@id']), label: opt.name || String(opt.id) }))
              .filter(opt => opt.value)}
          />
          <SelectField
            label="Tipo"
            value={product.type || 'product'}
            onChange={val => handleChange('type', val)}
            brandColors={brandColors}
            options={getContextTypes()}
          />
          <SelectField
            label="Condição"
            value={product.productCondition || 'new'}
            onChange={val => handleChange('productCondition', val)}
            brandColors={brandColors}
            options={[
              { value: 'new', label: 'Novo' },
              { value: 'used', label: 'Usado' },
              { value: 'recondicioned', label: 'Recondicionado' },
            ]}
          />
          <SelectField
            label={productUnitLabel}
            value={product.productUnit || ''}
            onChange={val => handleChange('productUnit', val)}
            brandColors={brandColors}
            placeholder={productUnitPlaceholder}
            options={[
              { value: '', label: 'Selecionar...' },
              ...productUnitOptions.map(opt => ({ value: opt.value, label: opt.label })),
            ]}
          />
          {!!productUnitHelperText && (
            <Text style={styles.fieldHelperText}>{productUnitHelperText}</Text>
          )}
        </SectionCard>

        {/* Seção: Configurações */}
        <SectionCard title="Configurações" icon="cog-outline" isOpen={openSections.has('config')} hasError={errorSections.has('config')} onToggle={() => toggleSection('config')}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Ativo</Text>
            <Switch
              value={Boolean(product.active)}
              onValueChange={val => handleChange('active', val)}
              trackColor={{ false: switchPalette.offTrack, true: switchPalette.onTrack }}
              thumbColor={Boolean(product.active) ? switchPalette.onThumb : switchPalette.offThumb}
              ios_backgroundColor={switchPalette.offTrack}
            />
          </View>
          <View style={[styles.switchRow, styles.switchRowLast]}>
            <Text style={styles.switchLabel}>Destaque</Text>
            <Switch
              value={Boolean(product.featured)}
              onValueChange={val => handleChange('featured', val)}
              trackColor={{ false: switchPalette.offTrack, true: switchPalette.onTrack }}
              thumbColor={Boolean(product.featured) ? switchPalette.onThumb : switchPalette.offThumb}
              ios_backgroundColor={switchPalette.offTrack}
            />
          </View>
          <View style={styles.switchRow}>
            <View style={inlineStyle_673_18}>
              <Text style={styles.switchLabel}>Controlar Estoque</Text>
              <Text style={inlineStyle_675_20}>
                Define local de entrada e saída para este produto
              </Text>
            </View>
            <Switch
              value={controlarEstoque}
              onValueChange={val => {
                setControlarEstoque(val);
                if (!val) {
                  handleChange('defaultOutInventory', '');
                  handleChange('defaultInInventory', '');
                }
              }}
              trackColor={{ false: switchPalette.offTrack, true: switchPalette.onTrack }}
              thumbColor={controlarEstoque ? switchPalette.onThumb : switchPalette.offThumb}
              ios_backgroundColor={switchPalette.offTrack}
            />
          </View>
          {controlarEstoque && (
            <>
              <SelectField
                label="Estoque de Saída *"
                value={product.defaultOutInventory || ''}
                onChange={val => handleChange('defaultOutInventory', val)}
                brandColors={brandColors}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...(inventoriesGetters.items || []).map(opt => ({ value: opt.id, label: opt.inventory || String(opt.id) })),
                ]}
              />
              <SelectField
                label="Estoque de Entrada *"
                value={product.defaultInInventory || ''}
                onChange={val => handleChange('defaultInInventory', val)}
                brandColors={brandColors}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...(inventoriesGetters.items || []).map(opt => ({ value: opt.id, label: opt.inventory || String(opt.id) })),
                ]}
              />
            </>
          )}
          <SelectField
            label="Fila"
            value={product.queue || ''}
            onChange={val => handleChange('queue', val)}
            brandColors={brandColors}
            options={[
              { value: '', label: 'Sem fila' },
              ...(queuesGetters.items || []).map(opt => ({ value: opt.id, label: opt.queue || opt.name || String(opt.id) })),
            ]}
          />
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Empresa</Text>
            <View style={styles.displayField}>
              <Text style={styles.displayFieldText}>
                {currentCompany?.name || (product.company ? String(product.company) : '—')}
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* Seção: Imagens */}
        {!!product?.id ? (
          <SectionCard title="Imagens" icon="image-multiple-outline" isOpen={openSections.has('imagens')} hasError={false} onToggle={() => toggleSection('imagens')}>
            <DefaultUpload
              relationStoreName="product_file"
              relationField="product"
              relationResource="products"
              entityId={product.id}
              attachments={product.productFiles || []}
              companyId={currentCompany?.id}
              context="products"
              coverRelationId={product?.extraData?.imageCoverRelationId}
              onChanged={reloadProduct}
              onCoverChanged={saveProductCover}
              title="Imagens"
              triggerLabel="Gerenciar imagens"
              managerTitle="Gerenciador de imagens"
              searchPlaceholder="Buscar imagem"
              uploadButtonLabel="Enviar nova"
              emptyAttachmentLabel="Nenhuma imagem anexada."
              emptyLibraryLabel="Nenhuma imagem encontrada."
            />
          </SectionCard>
        ) : (
          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="image-off-outline" size={20} color="#94A3B8" />
            <Text style={styles.infoBoxText}>{entityLabels.imageDisabled}</Text>
          </View>
        )}

      </ScrollView>
      <View style={styles.saveBar}>
        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveButton,
            {
              backgroundColor: buttonPalette.buttonBackground,
              borderColor: buttonPalette.buttonBorder,
              borderWidth: 1,
            },
          ]}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name="content-save-outline"
            size={20}
            color={buttonPalette.buttonIcon}
          />
          <Text style={[styles.saveButtonText, { color: buttonPalette.buttonText }]}>{entityLabels.saveAction}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
