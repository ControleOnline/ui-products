import { useWindowDimensions } from 'react-native'

const DESKTOP_GRID_MIN_WIDTH = 960

export { DESKTOP_GRID_MIN_WIDTH }

export const useCategoryGridLayout = () => {
  const { width } = useWindowDimensions()
  const columns = width < 640 ? 2 : width < 960 ? 3 : width < 1280 ? 4 : 5
  const isCompactMobile = width < 360
  const gap = isCompactMobile ? 8 : 12
  const containerWidth = Math.min(width || 0, 1600)
  const cardWidth = (containerWidth - gap - (columns - 1) * gap) / columns

  return {
    cardWidth,
    columns,
    gap,
    isCompactMobile,
    isMobileCatalog: width < 640,
  }
}
