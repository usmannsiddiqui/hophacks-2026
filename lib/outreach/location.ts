import { z } from "zod";
export const outreachAreaSchema=z.enum(["pasni","ormara","gwadar","jiwani"]);
export type OutreachAreaId=z.infer<typeof outreachAreaSchema>;
export const outreachAreaNames:Record<OutreachAreaId,string>={pasni:"Pasni",ormara:"Ormara",gwadar:"Gwadar",jiwani:"Jiwani"};
