# Supabase Integration Setup Guide

## Overview
This guide explains how to set up the Supabase backend for the Nosta Quote AI application, including Edge Functions and database configuration.

## Prerequisites
- Supabase account
- Supabase CLI installed
- Node.js and npm installed

## 1. Supabase Project Setup

### Create a new Supabase project:
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Note down your:
   - Project URL (e.g., `https://hsafglflkpjeapeluotb.supabase.co`)
   - Anon Key
   - Service Role Key (keep this secure!)

## 2. Database Schema

You'll need to create the following tables in your Supabase database:

### Core Tables:
```sql
-- Product Groups
CREATE TABLE ProductGroups (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(255) NOT NULL
);

-- Standards/Norms
CREATE TABLE Standards (
  id SERIAL PRIMARY KEY,
  standard_name VARCHAR(255) NOT NULL
);

-- Materials
CREATE TABLE Materials (
  id SERIAL PRIMARY KEY,
  material_name VARCHAR(255) NOT NULL,
  cost_per_gram DECIMAL(10,2) NOT NULL
);

-- Dimensions
CREATE TABLE Dimensions (
  id SERIAL PRIMARY KEY,
  value INTEGER NOT NULL
);

-- Bores
CREATE TABLE Bores (
  id SERIAL PRIMARY KEY,
  bore_size VARCHAR(50) NOT NULL,
  cost_per_bore DECIMAL(10,2) NOT NULL
);

-- Number of Bores
CREATE TABLE NumberOfBores (
  id SERIAL PRIMARY KEY,
  count INTEGER NOT NULL
);

-- Coatings
CREATE TABLE Coatings (
  id SERIAL PRIMARY KEY,
  coating_type VARCHAR(255) NOT NULL,
  cost_per_part DECIMAL(10,2) NOT NULL
);

-- Hardening Levels
CREATE TABLE HardeningLevels (
  id SERIAL PRIMARY KEY,
  hardening_level VARCHAR(255) NOT NULL,
  cost_per_lot DECIMAL(10,2) NOT NULL
);

-- Tolerances
CREATE TABLE Tolerances (
  id SERIAL PRIMARY KEY,
  tolerance_grade VARCHAR(50) NOT NULL,
  cost_per_side DECIMAL(10,2) NOT NULL
);
```

### Relationship Tables:
```sql
-- Product Group to Standards mapping
CREATE TABLE ProductGroup_Standards (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  standard_id INTEGER REFERENCES Standards(id)
);

-- Product Group to Available Materials mapping
CREATE TABLE ProductGroup_Available_Materials (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  material_id INTEGER REFERENCES Materials(id)
);

-- Product Group to Available Widths mapping
CREATE TABLE ProductGroup_Available_Widths (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  dimension_id INTEGER REFERENCES Dimensions(id)
);

-- Product Group to Available Heights mapping
CREATE TABLE ProductGroup_Available_Heights (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  dimension_id INTEGER REFERENCES Dimensions(id)
);

-- Product Group to Available Depths mapping
CREATE TABLE ProductGroup_Available_Depths (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  dimension_id INTEGER REFERENCES Dimensions(id)
);

-- Product Group to Available Bores mapping
CREATE TABLE ProductGroup_Available_Bores (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  bore_id INTEGER REFERENCES Bores(id)
);

-- Product Group to Available Number of Bores mapping
CREATE TABLE ProductGroup_Available_Num_Bores (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  num_bores_id INTEGER REFERENCES NumberOfBores(id)
);

-- Product Group to Available Coatings mapping
CREATE TABLE ProductGroup_Available_Coatings (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  coating_id INTEGER REFERENCES Coatings(id)
);

-- Product Group to Available Hardening mapping
CREATE TABLE ProductGroup_Available_Hardening (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  hardening_id INTEGER REFERENCES HardeningLevels(id)
);

-- Product Group to Available Tolerances mapping
CREATE TABLE ProductGroup_Available_Tolerances (
  id SERIAL PRIMARY KEY,
  product_group_id INTEGER REFERENCES ProductGroups(id),
  tolerance_id INTEGER REFERENCES Tolerances(id)
);
```

## 3. Sample Data

Insert some sample data to test the system:

```sql
-- Insert Product Groups
INSERT INTO ProductGroups (group_name) VALUES 
('Passfeder (Keyway)'),
('Scheibenfeder (Disc Spring)'),
('Nutenstein (T-Slot Nut)');

-- Insert Standards
INSERT INTO Standards (standard_name) VALUES 
('DIN 6885'),
('DIN 6888'),
('Keine Norm');

-- Insert Materials with costs
INSERT INTO Materials (material_name, cost_per_gram) VALUES 
('C45', 1.5),
('C60', 2.5),
('Edelstahl', 3.0),
('Aluminium', 4.5),
('Messing', 6.0);

-- Insert Dimensions
INSERT INTO Dimensions (value) VALUES 
(4), (5), (6), (7), (8), (9), (10), (11), (12), (13), (14), (15), (16), (17), (18), (19), (20), (21), (22), (23), (24), (25), (26), (27), (28), (29);

-- Insert Bores with costs
INSERT INTO Bores (bore_size, cost_per_bore) VALUES 
('M1', 10), ('M2', 11), ('M3', 12), ('M4', 13), ('M5', 14), ('M6', 15), ('M7', 16), ('M8', 17), ('M9', 18), ('M10', 19), ('M11', 20), ('M12', 21), ('M13', 22), ('M14', 23), ('M15', 24), ('M16', 25), ('M17', 26), ('M18', 27), ('M19', 28), ('M20', 29), ('M21', 30);

-- Insert Number of Bores
INSERT INTO NumberOfBores (count) VALUES 
(1), (2), (3), (4), (5), (6), (7), (8), (9), (10);

-- Insert Coatings with costs
INSERT INTO Coatings (coating_type, cost_per_part) VALUES 
('Typ 1', 3.2), ('Typ 2', 3.4), ('Typ 3', 3.6), ('Typ 4', 3.8), ('Typ 5', 4.0), ('Typ 6', 4.2), ('Typ 7', 4.4), ('Typ 8', 4.6), ('Typ 9', 4.8), ('Typ 10', 5.0), ('Typ 11', 5.2), ('Typ 12', 5.4), ('Typ 13', 5.6), ('Typ 14', 5.8), ('Typ 15', 6.0), ('Typ 16', 6.2), ('Typ 17', 6.4);

-- Insert Hardening Levels with costs
INSERT INTO HardeningLevels (hardening_level, cost_per_lot) VALUES 
('HRC 40', 50), ('HRC 41', 60), ('HRC 42', 70), ('HRC 43', 80), ('HRC 44', 90), ('HRC 45', 100), ('HRC 46', 110), ('HRC 47', 120), ('HRC 48', 130), ('HRC 49', 140), ('HRC 50', 150), ('HRC 51', 160), ('HRC 52', 170), ('HRC 53', 180), ('HRC 54', 190), ('HRC 55', 200), ('HRC 56', 210), ('HRC 57', 220), ('HRC 58', 230);

-- Insert Tolerances with costs
INSERT INTO Tolerances (tolerance_grade, cost_per_side) VALUES 
('h4', 1.5), ('h5', 1.6), ('h6', 1.7), ('h7', 1.8), ('h8', 1.9), ('h9', 2.0), ('h10', 2.1), ('h11', 2.2), ('h12', 2.3), ('h13', 2.4), ('h14', 2.5), ('h15', 2.6), ('h16', 2.7), ('h17', 2.8), ('none', 0);
```

## 4. Deploy Edge Functions

### Install Supabase CLI:
```bash
npm install -g supabase
```

### Login to Supabase:
```bash
supabase login
```

### Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Deploy the functions:
```bash
supabase functions deploy get-product-groups
supabase functions deploy get-options
supabase functions deploy calculate-price
```

## 5. Configure Environment Variables

In your Supabase project dashboard, go to Settings > Edge Functions and add:
- `SUPABASE_URL`: Your project URL
- `SUPABASE_ANON_KEY`: Your anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (for calculate-price function)

## 6. Update Frontend Configuration

In `src/components/PriceCalculatorSupabase.tsx`, the configuration is already set:

```typescript
const supabaseUrl = 'https://hsafglflkpjeapeluotb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzYWZnbGZsa3BqZWFwZWx1b3RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDM0NDEsImV4cCI6MjA3NDI3OTQ0MX0.GEUxLDEPJOul7iO4od93Dax1vEigwgCOXFAybvcWRWg';
```

## 7. Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to the application
3. Try selecting a product group
4. Verify that options load dynamically
5. Test price calculation
6. Test PDF generation

## 8. Row Level Security (RLS)

For production, enable RLS on your tables:

```sql
-- Enable RLS on all tables
ALTER TABLE ProductGroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE Standards ENABLE ROW LEVEL SECURITY;
-- ... repeat for all tables

-- Create policies for read access
CREATE POLICY "Allow read access" ON ProductGroups FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON Standards FOR SELECT USING (true);
-- ... repeat for all tables
```

## 9. Usage in Application

To use the Supabase version instead of the hardcoded version:

1. Import `PriceCalculatorSupabase` instead of `PriceCalculator` in your `Index.tsx`
2. Update the import statement:
   ```typescript
   import PriceCalculatorSupabase from '@/components/PriceCalculatorSupabase';
   ```
3. Replace the component in the JSX:
   ```typescript
   <PriceCalculatorSupabase 
     selectedProduct={selectedProduct} 
     onSendToChat={handleSendToChat}
     onFormFill={(data) => {
       // Form fill functionality handled via window global
     }}
   />
   ```

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure the `cors.ts` file is properly configured
2. **Authentication Errors**: Verify your Supabase keys are correct
3. **Database Errors**: Check that all tables and relationships are created
4. **Function Deployment**: Ensure you have the latest Supabase CLI

### Debug Tips:

1. Check browser console for errors
2. Monitor Supabase logs in the dashboard
3. Test Edge Functions individually using the Supabase dashboard
4. Verify database data using the Supabase table editor

## Next Steps

1. Set up proper authentication if needed
2. Add data validation and error handling
3. Implement caching for better performance
4. Add monitoring and analytics
5. Set up automated backups

This completes the Supabase integration setup. The application now uses a proper database backend instead of hardcoded data!
