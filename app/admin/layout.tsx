'use client';

import { useState, useEffect } from 'react';
import { ConfigProvider, App as AntApp, Layout, Menu, Typography, Button, Drawer } from 'antd';
import {
  DatabaseOutlined,
  CloudOutlined,
  MessageOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ApiOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import VConsole from '../components/VConsole';
import ReferralBadge from './components/ReferralBadge';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: 'tables',
    icon: <DatabaseOutlined />,
    label: <Link href="/admin">Tables (D1)</Link>,
  },
  {
    key: 'llm-keys',
    icon: <ApiOutlined />,
    label: <Link href="/admin/llm-keys">API Keys</Link>,
  },
  {
    key: 'kv',
    icon: <CloudOutlined />,
    label: <Link href="/admin/kv">KV Storage</Link>,
  },
  {
    key: 'providers',
    icon: <AppstoreOutlined />,
    label: <Link href="/admin/providers">Providers</Link>,
  },
  {
    key: 'chat',
    icon: <MessageOutlined />,
    label: <Link href="/admin/chat">Chat Test</Link>,
  },
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    label: <Link href="/admin/analytics">Analytics</Link>,
  },
  {
    key: 'domains',
    icon: <GlobalOutlined />,
    label: <Link href="/admin/domains">Domains</Link>,
  },
  {
    key: 'github-gists',
    icon: <GithubOutlined />,
    label: <Link href="/admin/github-gists">GitHub Gists</Link>,
  },
];

const PATH_KEY_MAP: Record<string, string> = {
  'llm-keys': 'llm-keys',
  'kv': 'kv',
  'providers': 'providers',
  'chat': 'chat',
  'analytics': 'analytics',
  'domains': 'domains',
  'github-gists': 'github-gists',
};

const PAGE_TITLE_MAP: Record<string, string> = {
  'tables': 'Database Management',
  'llm-keys': 'API Key Management',
  'kv': 'KV Storage Management',
  'providers': 'Providers',
  'chat': 'Chat Test',
  'analytics': 'API Analytics',
  'domains': 'Domain Query',
  'github-gists': 'GitHub Gists',
};

const SIDER_STYLE = {
  transition: 'all 0.2s',
} as const;

const BRAND_STYLE = {
  padding: '16px',
  borderBottom: '1px solid #f0f0f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  position: 'relative',
  height: 64,
} as const;

const TITLE_STYLE = {
  margin: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
} as const;

const HEADER_STYLE = {
  background: '#fff',
  padding: '0 24px',
  borderBottom: '1px solid #f0f0f0',
  display: 'flex',
  alignItems: 'center',
} as const;

const CONTENT_STYLE = {
  margin: '24px',
  padding: '24px',
  background: '#fff',
  borderRadius: '8px',
  minHeight: '280px',
} as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getSelectedKey = () => {
    for (const [path, key] of Object.entries(PATH_KEY_MAP)) {
      if (pathname?.includes(`/admin/${path}`)) {
        return key;
      }
    }
    return 'tables';
  };

  const getPageTitle = () => {
    const key = getSelectedKey();
    return PAGE_TITLE_MAP[key] || 'Database Management';
  };

  const handleMenuClick = () => {
    if (isMobile) setDrawerOpen(false);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          colorBgContainer: '#ffffff',
          colorText: '#0f172a',
          colorTextSecondary: '#666666',
          colorBorder: '#f0f0f0',
          colorError: '#ff4d4f',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          borderRadius: 4,
          controlHeight: 32,
          fontSize: 14,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        },
        components: {
          Button: {
            controlHeight: 32,
            borderRadius: 4,
            fontSize: 14,
            fontWeight: 500,
            colorPrimaryHover: '#40a9ff',
            defaultBg: '#ffffff',
            defaultColor: '#0f172a',
            defaultBorderColor: '#f0f0f0',
            colorError: '#ff4d4f',
          },
          Table: {
            headerBg: '#ffffff',
            headerColor: '#0f172a',
            rowHoverBg: '#fafafa',
            borderColor: '#f0f0f0',
            cellPaddingInline: 12,
            cellPaddingBlock: 8,
            borderRadius: 8,
            fontSize: 14,
          },
          Card: {
            colorBgContainer: '#ffffff',
            borderRadius: 8,
            boxShadow: 'none',
          },
          Modal: {
            colorBgContainer: '#ffffff',
            borderRadius: 8,
            boxShadow: 'none',
          },
          Input: {
            controlHeight: 32,
            borderRadius: 4,
            colorBgContainer: '#ffffff',
            colorText: '#0f172a',
            colorBorder: '#f0f0f0',
          },
          Select: {
            controlHeight: 32,
            borderRadius: 4,
            colorBgContainer: '#ffffff',
            colorBorder: '#f0f0f0',
          },
          Alert: {
            borderRadius: 4,
            colorErrorBg: '#fff2f0',
            colorErrorText: '#f5222d',
            colorWarningBg: '#fffbe6',
            colorWarningText: '#faad14',
          },
          Tag: {
            borderRadius: 12,
            fontSize: 12,
          },
          Layout: {
            headerBg: '#ffffff',
            headerHeight: 64,
            headerPadding: '0 24px',
            siderBg: '#ffffff',
          },
          Menu: {
            itemBg: '#ffffff',
            itemSelectedBg: '#e6f7ff',
            itemSelectedColor: '#1890ff',
            itemHoverBg: '#fafafa',
            itemActiveBg: '#e6f7ff',
            itemBorderRadius: 4,
          },
          Drawer: {
            colorBgContainer: '#ffffff',
          },
          Statistic: {
            contentFontSize: 24,
          },
          Descriptions: {
            colorText: '#0f172a',
            colorTextSecondary: '#666666',
          },
          Badge: {
            fontSize: 12,
          },
          Collapse: {
            colorBgContainer: '#ffffff',
            borderRadius: 8,
          },
        },
      }}
    >
      <VConsole />
      <AntApp>
        <Layout style={{ minHeight: '100vh' }}>
          {!isMobile && (
            <Sider width={220} theme="light" collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null} style={SIDER_STYLE}>
              <div style={{ ...BRAND_STYLE, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                <Title level={4} style={TITLE_STYLE}>
                  <DatabaseOutlined style={{ marginRight: 8 }} />
                  {!collapsed && 'Admin'}
                </Title>
                <Button
                  type="text"
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  style={{
                    position: collapsed ? 'absolute' : 'relative',
                    right: collapsed ? 8 : 'auto',
                    top: collapsed ? '50%' : 'auto',
                    transform: collapsed ? 'translateY(-50%)' : 'none',
                  }}
                />
              </div>
              <Menu mode="inline" selectedKeys={[getSelectedKey()]} items={menuItems} inlineCollapsed={collapsed} />
            </Sider>
          )}
          {isMobile && (
            <Drawer title="Admin" placement="left" closable onClose={() => setDrawerOpen(false)} open={drawerOpen} size="85%">
              <Menu mode="inline" selectedKeys={[getSelectedKey()]} items={menuItems} onClick={handleMenuClick} />
            </Drawer>
          )}
          <Layout>
            <Header style={{ ...HEADER_STYLE, padding: isMobile ? '0 12px' : '0 24px' }}>
              {isMobile && (
                <Button type="text" icon={<MenuUnfoldOutlined />} onClick={() => setDrawerOpen(true)} style={{ marginRight: 12 }} />
              )}
              <Title level={isMobile ? 5 : 4} style={{ margin: 0, flex: 1 }}>
                {getPageTitle()}
              </Title>
              <ReferralBadge />
            </Header>
            <Content style={{ ...CONTENT_STYLE, margin: isMobile ? '12px' : '24px', padding: isMobile ? '12px' : '24px' }}>
              {children}
            </Content>
          </Layout>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}
