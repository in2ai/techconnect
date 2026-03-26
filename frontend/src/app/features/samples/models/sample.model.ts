export interface Sample {
  id: string;
  has_serum: boolean | null;
  has_buffy: boolean | null;
  has_plasma: boolean | null;
  has_tumor_tissue: boolean | null;
  has_non_tumor_tissue: boolean | null;
  obtain_date: string | null;
  organ: string | null;
  is_metastasis: boolean | null;
  tumor_biobank_code: string | null;
}
