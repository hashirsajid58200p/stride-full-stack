import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "Stride";
const DEFAULT_TITLE = "Stride | Premium Athletic & Lifestyle Footwear";
const DEFAULT_DESCRIPTION =
  "Discover premium athletic performance shoes, lifestyle sneakers, and streetwear footwear at Stride. Fast shipping, easy returns, and exclusive drops.";
const DEFAULT_IMAGE = "https://stride-full-stack.vercel.app/og-image.jpg";
const BASE_URL = "https://stride-full-stack.vercel.app";

const SEO = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  canonicalUrl,
  type = "website",
  noindex = false,
  jsonLd,
}) => {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const currentCanonical = canonicalUrl
    ? canonicalUrl.startsWith("http")
      ? canonicalUrl
      : `${BASE_URL}${canonicalUrl}`
    : typeof window !== "undefined"
      ? window.location.href.split("?")[0]
      : BASE_URL;

  return (
    <Helmet>
      {/* Standard metadata */}
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={currentCanonical} />

      {/* Search Engine Robots Indexing */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentCanonical} />
      <meta property="og:image" content={image} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
