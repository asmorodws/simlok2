-- Update existing users to have proper verification_status
UPDATE User 
SET verification_status = 'VERIFIED' 
WHERE verified_at IS NOT NULL;

UPDATE User 
SET verification_status = 'PENDING' 
WHERE verified_at IS NULL AND verification_status IS NULL;