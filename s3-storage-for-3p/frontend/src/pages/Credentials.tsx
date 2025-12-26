import React from 'react';
import { Layout } from '../components/Common/Layout';
import { CredentialManager } from '../components/CredentialManager/CredentialManager';

export const Credentials: React.FC = () => {
  return (
    <Layout>
      <CredentialManager />
    </Layout>
  );
};
