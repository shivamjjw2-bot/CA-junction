CREATE OR REPLACE FUNCTION public.has_active_membership(target_user uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select coalesce(target_user = auth.uid(), false) and exists(select 1 from public.memberships m where m.user_id = target_user and m.expires_at > now()) $function$;

CREATE OR REPLACE FUNCTION public.has_material_entitlement(target_user uuid, target_material uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select coalesce(target_user = auth.uid(), false) and exists(select 1 from public.entitlements e where e.user_id = target_user and e.material_id = target_material) $function$;

CREATE OR REPLACE FUNCTION public.has_test_entitlement(target_user uuid, target_test uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select coalesce(target_user = auth.uid(), false) and exists(select 1 from public.entitlements e where e.user_id = target_user and e.test_id = target_test) $function$;
