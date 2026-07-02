import { PixelRatio } from 'react-native';

export function sizedPicsumUrl(
  url: string,
  displayWidth: number,
  displayHeight: number,
): string {
  const w = PixelRatio.getPixelSizeForLayoutSize(displayWidth);
  const h = PixelRatio.getPixelSizeForLayoutSize(displayHeight);
  return url.replace(/\/\d+\/\d+(?=($|\?))/, `/${w}/${h}`);
}

export function sizedPravatarUrl(url: string, displaySize: number): string {
  const size = PixelRatio.getPixelSizeForLayoutSize(displaySize);
  return url.replace(/(i\.pravatar\.cc)\/\d+/, `$1/${size}`);
}
