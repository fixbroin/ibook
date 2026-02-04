import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;

export function getPlaceholderImage(id: string): ImagePlaceholder {
    const defaultImage = {
        id: 'default',
        description: 'Default placeholder image',
        imageUrl: 'https://picsum.photos/seed/default/1024/768',
        imageHint: 'placeholder'
    };
    return PlaceHolderImages.find(img => img.id === id) || defaultImage;
}
