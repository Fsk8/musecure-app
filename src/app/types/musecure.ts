type NotarizeResult<T> = { commitment: string; payload: T };
export type MuSecureProof = {
  kind: "musecure_proof_v1";
  address: string;
  title?: string | null;
  artist?: string | null;
  cid_audio: string;
  sha256_audio: string;
  fingerprint?: string | null;
  metadata?: Record<string, unknown> | null;
  timestamp: number; // epoch seconds (Oracle.now())
};
