export const PUBLIC_DOCS_SOURCE_REPO = 'seasonalnet-docs';
export const PUBLIC_DOCS_SOURCE_REMOTE =
  'https://git.seasonalnet.org/Seasonal_Currency/seasonalnet-docs';

// Default sibling checkout on SeasonalWeb when both repos live under /opt/git-staging/.
export const PUBLIC_DOCS_SOURCE_DEFAULT_PATH = '../../seasonalnet-docs';

// These paths must never be published, even if they appear in the source repo later.
export const PUBLIC_DOCS_DENY_PREFIXES = ['VMs/'];

// Files that the sync pipeline is allowed to write into apps/docs/content/docs.
// Keep this list explicit so future additions require a deliberate policy change.
export const PUBLIC_DOCS_MANAGED_OUTPUTS = [
  'index.mdx',
  'meta.json',
  'network/index.mdx',
  'network/lans/index.mdx',
  'network/lans/main-lan.mdx',
  'network/lans/seasonalcme.mdx',
  'network/lans/phone-lan.mdx',
  'network/lans/meta.json',
];

// Explicit allowlist of publishable docs and their destination routes.
// The outputPath values are relative to apps/docs/content/docs.
export const PUBLIC_DOCS_ALLOWLIST = [
  {
    sourcePath: 'README.md',
    outputPath: 'index.mdx',
    routePath: '/docs',
    title: 'SeasonalNet Documentation',
    description: 'Public overview and publication scope for SeasonalNet documentation.',
  },
  {
    sourcePath: 'NETWORK.md',
    outputPath: 'network/index.mdx',
    routePath: '/docs/network',
    title: 'SeasonalNet Network Overview',
    description: 'Top-level index of SeasonalNet network segments and routing boundaries.',
  },
  {
    sourcePath: 'LANs/seasonalnet-lan-map.md',
    outputPath: 'network/lans/main-lan.mdx',
    routePath: '/docs/network/lans/main-lan',
    title: 'SeasonalNet Main LAN',
    description: 'Address bands, infrastructure inventory, and routing notes for the main LAN.',
  },
  {
    sourcePath: 'LANs/seasonalcme-network-map.md',
    outputPath: 'network/lans/seasonalcme.mdx',
    routePath: '/docs/network/lans/seasonalcme',
    title: 'SeasonalCME Network Map',
    description: 'Voice and management VLAN topology for the SeasonalCME lab.',
  },
  {
    sourcePath: 'LANs/phonelan-map.md',
    outputPath: 'network/lans/phone-lan.mdx',
    routePath: '/docs/network/lans/phone-lan',
    title: 'SeasonalNet Phone-LAN',
    description: 'Routing, services, and attached-device map for the Phone-LAN segment.',
  },
];

export const PUBLIC_DOCS_ROOT_META = {
  title: 'Documentation',
  pages: ['index', 'network'],
};

export const PUBLIC_DOCS_LANS_META = {
  title: 'LAN Maps',
  pages: ['index', 'main-lan', 'seasonalcme', 'phone-lan'],
};
