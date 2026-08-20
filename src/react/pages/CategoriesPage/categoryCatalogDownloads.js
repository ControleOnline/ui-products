import { Alert } from 'react-native'
import {
  downloadMenuCatalog as downloadCompanyMenuCatalog,
} from '@controleonline/ui-common/src/react/utils/menuCatalogDownload'
import {
  downloadNormalizedCatalog as downloadCompanyNormalizedCatalog,
} from '@controleonline/ui-common/src/react/utils/normalizedCatalogDownload'
import { normalizeEntityId, slugifyFileName } from './categoryPageUtils'

export async function loadMenuModelsForCompany({ currentCompany, modelActions }) {
  if (!currentCompany?.id) {
    return []
  }

  const currentCompanyId = normalizeEntityId(currentCompany.id)

  try {
    const response = await modelActions.getItems({ context: 'menu', people: currentCompanyId })
    const availableModels = (Array.isArray(response) ? response : [])
      .filter(model => {
        const modelCompanyId = normalizeEntityId(model?.people || model?.company)
        return !modelCompanyId || modelCompanyId === currentCompanyId
      })
      .sort((first, second) =>
        String(first?.model || '').localeCompare(String(second?.model || ''), 'pt-BR', {
          sensitivity: 'base',
        }),
      )

    modelActions.setError?.(null)
    return availableModels
  } catch {
    modelActions.setError?.(null)
    return []
  }
}

export async function downloadMenuCatalogForCompany({
  currentCompany,
  modelIri,
}) {
  if (!currentCompany?.id || !modelIri) {
    return
  }

  await downloadCompanyMenuCatalog({
    companyId: currentCompany.id,
    companyName: currentCompany?.alias || currentCompany?.name || slugifyFileName(currentCompany?.id),
    modelReference: modelIri,
  })
}

export async function downloadNormalizedCatalogForCompany({
  currentCompany,
  context,
}) {
  if (!currentCompany?.id) {
    return
  }

  await downloadCompanyNormalizedCatalog({
    companyId: currentCompany.id,
    companyName: currentCompany?.alias || currentCompany?.name || slugifyFileName(currentCompany?.id),
    context,
  })
}

export function alertCatalogError(titleKey, error) {
  Alert.alert(global.t?.t?.('categories', 'title', titleKey), error?.message)
}

export function alertCatalogMessage(titleKey, messageKey) {
  Alert.alert(
    global.t?.t?.('categories', 'title', titleKey),
    global.t?.t?.('categories', 'message', messageKey),
  )
}
