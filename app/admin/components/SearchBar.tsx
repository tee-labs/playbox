'use client';

import { useState, useEffect } from 'react';
import { Space, Select, Input, Button } from 'antd';
import { SearchOutlined, ClearOutlined, PlusOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnInfo } from '../types';

interface SearchBarProps {
  columns: ColumnInfo[];
  onSearch: (value: string, column: string) => void;
  onCreate: () => void;
  onImport: () => void;
  onRefresh: () => void;
}

export default function SearchBar({ columns, onSearch, onCreate, onImport, onRefresh }: SearchBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (columns.length > 0 && !searchColumn) {
      setSearchColumn(columns[0].name);
    }
  }, [columns, searchColumn]);

  const handleSearch = () => {
    if (searchColumn) {
      onSearch(searchValue, searchColumn);
    }
  };

  const handleClear = () => {
    setSearchValue('');
    onSearch('', '');
  };

  if (isMobile) {
    return (
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Space.Compact style={{ width: '100%' }} direction="vertical">
          <Select
            style={{ width: '100%' }}
            value={searchColumn}
            onChange={setSearchColumn}
            options={columns.map((c) => ({ label: c.name, value: c.name }))}
            placeholder="Select column"
          />
          <Input placeholder="Search..." value={searchValue} onChange={(e) => setSearchValue(e.target.value)} onPressEnter={handleSearch} />
          <div style={{ display: 'flex', gap: 4 }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} style={{ flex: 1 }}>
              Search
            </Button>
            <Button icon={<ClearOutlined />} onClick={handleClear} style={{ flex: 1 }}>
              Clear
            </Button>
          </div>
        </Space.Compact>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            New
          </Button>
          <Button icon={<UploadOutlined />} onClick={onImport}>
            Import
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <Space.Compact style={{ width: 400 }}>
        <Select
          style={{ width: 150 }}
          value={searchColumn}
          onChange={setSearchColumn}
          options={columns.map((c) => ({ label: c.name, value: c.name }))}
          placeholder="Select column"
        />
        <Input
          style={{ width: 200 }}
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          Search
        </Button>
        <Button icon={<ClearOutlined />} onClick={handleClear}>
          Clear
        </Button>
      </Space.Compact>

      <div style={{ flex: 1 }} />

      <Space>
        <Button icon={<ReloadOutlined />} onClick={onRefresh}>
          Refresh
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          New Row
        </Button>
        <Button icon={<UploadOutlined />} onClick={onImport}>
          Import
        </Button>
      </Space>
    </div>
  );
}
