import React from 'react';
import { Layout } from '../components/Common/Layout';
import { S3Browser } from '../components/S3Browser/S3Browser';

export const Dashboard: React.FC = () => {
  return (
    <Layout>
      <S3Browser />
    </Layout>
  );
};
