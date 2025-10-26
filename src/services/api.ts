import axios from "axios";
import {
  PreAuditReport,
  GitHubRepository,
  GitHubRepositoryContent,
  GenerateReportRequest,
  StaticAnalysisReport,
  StaticAnalysisDto,
} from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const scopingApi = {
  // Health check
  health: async () => {
    const response = await api.post("/scoping/health");
    return response.data;
  },

  // Generate pre-audit report
  generateReport: async (
    request: GenerateReportRequest
  ): Promise<PreAuditReport> => {
    const response = await api.post("/scoping/generate-report", request);
    return response.data;
  },
};

export const staticAnalysisApi = {
  // Analyze Rust contract
  analyzeRustContract: async (
    request: StaticAnalysisDto
  ): Promise<StaticAnalysisReport> => {
    const response = await api.post(
      "/static-analysis/analyze-rust-contract",
      request
    );
    return response.data;
  },

  // Get all reports
  getAllReports: async (): Promise<StaticAnalysisReport[]> => {
    const response = await api.post("/static-analysis/reports");
    return response.data;
  },

  // Get available factors for export
  getAvailableFactors: async (): Promise<FactorsResponse> => {
    const response = await api.post("/static-analysis/available-factors", {});
    return response.data;
  },
  getReportById: async (id: string): Promise<StaticAnalysisReport> => {
    const response = await api.get(`/static-analysis/reports/${id}`);
    return response.data;
  },

  // Export reports to CSV
  exportReportsCSV: async (
    reportIds?: string[],
    factors?: string[]
  ): Promise<{ blob: Blob; filename: string }> => {
    const requestBody: { reportIds?: string[]; factors?: string[] } = {};

    if (reportIds && reportIds.length > 0) {
      requestBody.reportIds = reportIds;
    }

    if (factors && factors.length > 0) {
      requestBody.factors = factors;
    }

    const response = await api.post("/static-analysis/export-csv", requestBody);

    // Handle JSON response with CSV content
    if (response.data && response.data.csv && response.data.filename) {
      const csvContent = response.data.csv;
      const filename = response.data.filename;

      // Create a proper CSV blob
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      return { blob, filename };
    }

    // Fallback: if it's already a blob
    if (response.data instanceof Blob) {
      return {
        blob: response.data,
        filename: `analysis-reports-${
          new Date().toISOString().split("T")[0]
        }.csv`,
      };
    }

    throw new Error("Invalid response format");
  },
};

export const authApi = {
  // Get GitHub OAuth URL
  getGitHubAuthUrl: async (): Promise<{ authUrl: string }> => {
    const response = await api.get("/auth/github/url");
    return response.data;
  },

  // Validate GitHub token
  validateToken: async (
    token: string
  ): Promise<{ valid: boolean; user?: unknown; error?: string }> => {
    const response = await api.get(
      `/auth/validate?token=${encodeURIComponent(token)}`
    );
    return response.data;
  },
};

export async function fetchRepoFilesPublic(owner: string, repo: string) {
  // Step 1: Get Default Branch
  const meta = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!meta.ok) throw new Error("Repo not found or access denied");
  const repoInfo = await meta.json();
  const defaultBranch = repoInfo.default_branch;

  // Step 2: Get File Tree from default branch
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );
  if (!treeRes.ok) throw new Error("Unable to fetch repo file tree");

  const data = await treeRes.json();

  const rsFilesOnly = data.tree.filter(
    (i: any) => i.type === "blob" && i.path.endsWith(".rs")
  );

  return { rsFilesOnly };
}

interface ContractFile {
  path: string;
  name: string;
  size: number;
  language: string;
}

interface ContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  contents?: ContentItem[];
}

interface FactorInfo {
  name: string;
  type: string;
  description: string;
}

interface FactorGroup {
  category: string;
  description: string;
  factors: Record<string, FactorInfo>;
}

export interface FactorsResponse {
  [groupKey: string]: FactorGroup;
}

export type { FactorInfo, FactorGroup };

export const uploadApi = {
  // Step 1: Upload and discover files (like GitHub file discovery)
  discoverFiles: async (
    file: File
  ): Promise<{ extractedPath: string; contractFiles: ContractFile[] }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/uploads/discover-files", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Convert the backend response to the expected format
    const contractFiles: ContractFile[] = (
      response.data.contract_files || []
    ).map((filePath: string) => {
      // Extract file name from path
      const fileName = filePath.split("/").pop() || filePath;

      // Determine language from file extension
      let language = "Unknown";
      if (fileName.endsWith(".rs")) {
        language = "Rust (Solana/Near)";
      } else if (fileName.endsWith(".sol")) {
        language = "Solidity (EVM)";
      }

      // Find file size from contents if available
      let size = 0;
      const findFileInContents = (
        contents: ContentItem[],
        targetPath: string
      ): ContentItem | null => {
        for (const item of contents) {
          if (item.path === targetPath && item.type === "file") {
            return item;
          }
          if (item.contents) {
            const found = findFileInContents(item.contents, targetPath);
            if (found) return found;
          }
        }
        return null;
      };

      const fileInfo = findFileInContents(
        response.data.contents || [],
        filePath
      );
      if (fileInfo) {
        size = fileInfo.size;
      }

      return {
        path: filePath,
        name: fileName,
        size: size,
        language: language,
      };
    });

    return {
      extractedPath: response.data.extractedPath,
      contractFiles: contractFiles,
    };
  },

  // Step 2: Analyze selected uploaded contracts (like GitHub static analysis)
  analyzeUploadedContracts: async (
    extractedPath: string,
    selectedFiles: string[]
  ): Promise<StaticAnalysisReport> => {
    const response = await api.post(
      "/static-analysis/analyze-uploaded-contract",
      {
        extractedPath,
        selectedFiles,
        analysisOptions: {
          includeTests: false,
          includeDependencies: true,
          depth: "deep",
        },
      }
    );
    return response.data;
  },
};

export const githubApi = {
  // Get user repositories
  getUserRepositories: async (
    accessToken: string
  ): Promise<GitHubRepository[]> => {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: {
        sort: "updated",
        per_page: 100,
      },
    });
    return response.data;
  },

  // Get specific repository info
  getRepository: async (
    owner: string,
    repo: string,
    accessToken: string
  ): Promise<GitHubRepository> => {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    return response.data;
  },

  // Get repository contents
  getRepositoryContents: async (
    owner: string,
    repo: string,
    accessToken: string,
    path: string = ""
  ): Promise<GitHubRepositoryContent[]> => {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    return response.data;
  },
};
