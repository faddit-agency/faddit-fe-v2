import axios from 'axios';
import { RECOMMEND_API_BASE_URL } from '../config';

export type RecommendWarning = {
  code: string;
  message: string;
};

export type RecommendConflict = {
  detected: boolean;
  reasons: string[];
};

export type RecommendAssetUrls = {
  sketch?: string;
  json?: string;
  pattern?: string;
  vector?: string;
};

export type RecommendRow = {
  template_id: string;
  class_base: string;
  score: number;
  score_breakdown?: {
    keyword?: number;
    image?: number;
    preference?: number;
  };
  consistency?: {
    keyword?: boolean;
    image?: boolean;
  };
  metadata?: {
    information?: {
      category_kr?: string;
      category_en?: string;
      gender?: string;
      category_detail?: string;
      [key: string]: unknown;
    };
    sketch?: {
      sketch_caption?: string;
      sketch_filename?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  assets?: {
    sketch_image_path?: string;
    label_json_path?: string;
    pattern_file?: string;
    vector_file?: string;
  };
  asset_urls?: RecommendAssetUrls;
  [key: string]: unknown;
};

export type RecommendResponse = {
  mode: 'keyword_only' | 'image_only' | 'hybrid';
  query?: {
    keyword?: string;
    top_k?: number;
    effective_top_k?: number;
    min_score?: number;
    effective_min_score?: number;
    diversity_class_limit?: number;
    effective_diversity_class_limit?: number;
  };
  detections?: Array<{
    class_id?: number;
    class_name?: string;
    confidence?: number;
    [key: string]: unknown;
  }>;
  warnings?: RecommendWarning[];
  conflict?: RecommendConflict;
  ranking_diagnostics?: Record<string, unknown>;
  natural_query_analysis?: {
    applied?: boolean;
    tokens?: string[];
    matched_rules?: string[];
    profile?: Record<string, unknown>;
    [key: string]: unknown;
  };
  detection_diagnostics?: Record<string, unknown> | null;
  catalog_size?: number;
  recommendations?: RecommendRow[];
  alternative_recommendations?: Record<string, RecommendRow[]>;
};

export type RecommendRequest = {
  keyword?: string;
  file?: File | null;
  topK?: number;
  minScore?: number;
  diversityClassLimit?: number;
};

export const resolveRecommendAssetUrl = (url?: string) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${RECOMMEND_API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const requestTemplateRecommendations = async ({
  keyword,
  file,
  topK = 5,
  minScore = 0.05,
  diversityClassLimit = 2,
}: RecommendRequest) => {
  const formData = new FormData();
  const normalizedKeyword = keyword?.trim();

  if (normalizedKeyword) {
    formData.append('keyword', normalizedKeyword);
  }
  if (file) {
    formData.append('file', file);
  }

  formData.append('top_k', String(topK));
  formData.append('min_score', String(minScore));
  formData.append('diversity_class_limit', String(diversityClassLimit));

  const response = await axios.post<RecommendResponse>(
    `${RECOMMEND_API_BASE_URL}/recommend`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
};
