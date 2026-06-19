interface OptimizedImageProps {
  url: string
  alt: string
  className?: string
}

export function OptimizedImage({ url, alt, className }: OptimizedImageProps) {
  return (
    <img
      loading="lazy"
      decoding="async"
      src={url}
      alt={alt}
      className={className}
    />
  )
}
