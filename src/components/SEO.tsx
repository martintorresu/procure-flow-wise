import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
}

const SITE = "Pro.Curem Flow";
const BASE_URL = "https://procurement.demo.inovahr-app.com";

export function SEO({ title, description, path }: SEOProps) {
  const fullTitle = title.includes(SITE) ? title : `${title} | ${SITE}`;
  const url = path ? `${BASE_URL}${path}` : BASE_URL;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
