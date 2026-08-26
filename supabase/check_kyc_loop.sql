-- Diagnóstico read-only para el bucle de verificación de identidad.
-- Reemplazá el seller_id si hace falta chequear otro usuario.
select
  id as session_row_id,
  seller_id,
  session_id,
  status,
  face_match_score,
  created_at,
  updated_at
from identity_verifications
where seller_id = 'e0756c0b-f695-4d2d-a2bb-74ef11e87496'
order by created_at desc;

select id, name, identity_verified
from sellers
where id = 'e0756c0b-f695-4d2d-a2bb-74ef11e87496';
