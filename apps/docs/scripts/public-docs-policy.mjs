export const PUBLIC_DOCS_SOURCE_REPO = 'seasonalnet-docs';
export const PUBLIC_DOCS_SOURCE_REMOTE =
  'https://git.seasonalnet.org/Seasonal_Currency/seasonalnet-docs';

// Default sibling checkout on SeasonalWeb when both repos live under /opt/git-staging/.
// apps/docs -> /opt/git-staging/seasonalnet-web/apps/docs
// sibling docs repo -> /opt/git-staging/seasonalnet-docs
export const PUBLIC_DOCS_SOURCE_DEFAULT_PATH = '../../../seasonalnet-docs';

// These paths must never be published, even if they appear in the source repo later.
export const PUBLIC_DOCS_DENY_PREFIXES = ['VMs/'];

// Files that the sync pipeline is allowed to write into apps/docs/content/docs.
// Keep this list explicit so future additions require a deliberate policy change.
export const PUBLIC_DOCS_MANAGED_OUTPUTS = [
  'index.mdx',
  'meta.json',
  'about/index.mdx',
  'about/platform.mdx',
  'about/services.mdx',
  'about/meta.json',
  'topology/index.mdx',
  'topology/lans/index.mdx',
  'topology/lans/main-lan.mdx',
  'topology/lans/management-vlans.mdx',
  'topology/lans/seasonalcme.mdx',
  'topology/lans/phone-lan.mdx',
  'topology/lans/seasonalvpn.mdx',
  'topology/lans/meta.json',
  'topology/meta.json',
  'projects/index.mdx',
  'policies/index.mdx',
  'policies/privacy.mdx',
  'policies/terms.mdx',
  'policies/acceptable-use.mdx',
  'policies/meta.json',
];

// Explicit allowlist of publishable docs and their destination routes.
// The outputPath values are relative to apps/docs/content/docs.
export const PUBLIC_DOCS_ALLOWLIST = [
  {
    sourcePath: 'README.md',
    outputPath: 'index.mdx',
    routePath: '/docs',
    title: 'SeasonalNet Documentation',
    description: 'Public documentation index for SeasonalNet platform, topology, project guides, and policies.',
  },
  {
    sourcePath: 'PLATFORM.md',
    outputPath: 'about/platform.mdx',
    routePath: '/docs/about/platform',
    section: 'about',
    title: 'SeasonalNet Platform Overview',
    description: 'High-level definition of SeasonalNet, its operating model, and major platform domains.',
  },
  {
    sourcePath: 'SERVICES.md',
    outputPath: 'about/services.mdx',
    routePath: '/docs/about/services',
    section: 'about',
    title: 'SeasonalNet Services Overview',
    description: 'Public-safe catalog of major SeasonalNet services and subsystem boundaries.',
  },
  {
    sourcePath: 'NETWORK.md',
    outputPath: 'topology/index.mdx',
    routePath: '/docs/topology',
    title: 'SeasonalNet Topology',
    description: 'Top-level index of SeasonalNet network segments and routing boundaries.',
  },
  {
    sourcePath: 'LANs/seasonalnet-lan-map.md',
    outputPath: 'topology/lans/main-lan.mdx',
    routePath: '/docs/topology/lans/main-lan',
    section: 'topology-lans',
    title: 'SeasonalNet Main LAN',
    description: 'Address bands, infrastructure inventory, and routing notes for the main LAN.',
  },
  {
    sourcePath: 'LANs/management-vlans-map.md',
    outputPath: 'topology/lans/management-vlans.mdx',
    routePath: '/docs/topology/lans/management-vlans',
    section: 'topology-lans',
    title: 'SeasonalNet Management VLANs',
    description: 'Topology documentation for the management VLAN segments.',
  },
  {
    sourcePath: 'LANs/seasonalcme-network-map.md',
    outputPath: 'topology/lans/seasonalcme.mdx',
    routePath: '/docs/topology/lans/seasonalcme',
    section: 'topology-lans',
    title: 'SeasonalCME Network Map',
    description: 'Voice and management VLAN topology for the SeasonalCME segment',
  },
  {
    sourcePath: 'LANs/phonelan-map.md',
    outputPath: 'topology/lans/phone-lan.mdx',
    routePath: '/docs/topology/lans/phone-lan',
    section: 'topology-lans',
    title: 'SeasonalNet Phone-LAN',
    description: 'Routing, services, and attached-device map for the Phone-LAN segment.',
  },
  {
    sourcePath: 'LANs/seasonalvpn-network-map.md',
    outputPath: 'topology/lans/seasonalvpn.mdx',
    routePath:  '/docs/topology/lans/seasonalvpn',
    section: 'topology-lans',
    title: 'SeasonalNet VPN LAN',
    description: 'Network topology for the SeasonalNet VPN segment.',
  },
  {
    sourcePath: 'PROJECTS.md',
    outputPath: 'projects/index.mdx',
    routePath: '/docs/projects',
    title: 'Projects',
    description: 'Scalable public documentation for SeasonalNet-originated FOSS projects, guides, and reusable systems.',
  },
  {
    sourcePath: 'POLICIES.md',
    outputPath: 'policies/index.mdx',
    routePath: '/docs/policies',
    title: 'SeasonalNet Policies',
    description: 'Platform-wide privacy, service, and acceptable-use policies for SeasonalNet-operated services.',
  },
  {
    sourcePath: 'Policies/privacy.md',
    outputPath: 'policies/privacy.mdx',
    routePath: '/docs/policies/privacy',
    section: 'policies',
    title: 'Privacy Notice',
    description: 'How SeasonalNet processes operational, account, service, and security information.',
  },
  {
    sourcePath: 'Policies/terms.md',
    outputPath: 'policies/terms.mdx',
    routePath: '/docs/policies/terms',
    section: 'policies',
    title: 'Terms of Service',
    description: 'Conditions for accessing and using SeasonalNet-operated services.',
  },
  {
    sourcePath: 'Policies/acceptable-use.md',
    outputPath: 'policies/acceptable-use.mdx',
    routePath: '/docs/policies/acceptable-use',
    section: 'policies',
    title: 'Acceptable Use Policy',
    description: 'Prohibited activity and the controls SeasonalNet may use to protect the platform.',
  },
];

export const PUBLIC_DOCS_ROOT_META = {
  title: 'Documentation',
  pages: ['index', 'about', 'topology', 'projects', 'policies'],
};

export const PUBLIC_DOCS_ABOUT_META = {
  title: 'About',
  pages: ['index', 'platform', 'services'],
};

export const PUBLIC_DOCS_TOPOLOGY_META = {
  title: 'Topology',
  pages: ['index', 'lans'],
};

export const PUBLIC_DOCS_LANS_META = {
  title: 'LAN Maps',
  pages: ['index', 'management-vlans', 'main-lan', 'seasonalcme', 'phone-lan', 'seasonalvpn'],
};

export const PUBLIC_DOCS_POLICIES_META = {
  title: 'Policies',
  pages: ['index', 'privacy', 'terms', 'acceptable-use'],
};
