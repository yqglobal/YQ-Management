INSERT INTO "Tenant" (id, name, subdomain, "businessType", "strictPrivacyMode") 
VALUES ('c1a6ab78-2b28-4e89-8d4e-1234567890ab', 'Super Admin Tenant', 'superadmin', 'general', false);

INSERT INTO "User" (id, email, password, role, "tenantId") 
VALUES (gen_random_uuid(), 'yqbuddysa@gmail.com', '$2b$10$LAm2QQEBA41w.QYOmJ5.Oe3/Yaw2vnxJyBPBygydFB7z0LO6lKm0.', 'SUPER_ADMIN', 'c1a6ab78-2b28-4e89-8d4e-1234567890ab');
