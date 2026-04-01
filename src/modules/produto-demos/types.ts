export type CnpjDemoShape = {
  company_name: string;
  status: string;
  opening_date: string;
  main_activity: string;
  address: string;
  /** true = dados fictícios para demo; não confundir com consulta Receita */
  isIllustrative: boolean;
};
