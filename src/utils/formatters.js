export const formatNumber = (num) => {
  if (num === 0) return '0'
  const numStr = num.toString().replace(/^0+/, '') // Remove leading zeros
  if (numStr.length > 3) {
    return numStr.substring(0, 3)
  }
  return numStr
}
