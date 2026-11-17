-- O tema padrão passa a ser o visual do próprio LashOS (antes o banco guardava um rosa que o app não usava).
ALTER TABLE "Professional" ALTER COLUMN "accentColor" SET DEFAULT '#2A2240',
ALTER COLUMN "backgroundColor" SET DEFAULT '#F3F3F6';

-- Quem nunca escolheu cores (ainda com o par antigo) fica no tema padrão.
UPDATE "Professional"
SET "accentColor" = '#2A2240', "backgroundColor" = '#F3F3F6'
WHERE UPPER("accentColor") = '#D6336C' AND UPPER("backgroundColor") = '#FFD9E9';
