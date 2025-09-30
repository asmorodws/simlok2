-- Update all ADMIN users to SUPER_ADMIN role before migration
UPDATE User SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';

-- Update verified_by references from ADMIN to SUPER_ADMIN  
UPDATE User SET verified_by = 'SUPER_ADMIN' WHERE verified_by = 'ADMIN';