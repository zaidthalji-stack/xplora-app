import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Property {
  Property_ID?: string;
  Building_Name?: string;
  Location?: string;
  Community?: string;
  Property_Type?: string;
  Transaction_Type?: string;
  Price?: number;
  Bedrooms?: number;
  Bathrooms?: number;
  'Property_Size_(sqft)'?: number;
  Latitude?: number;
  Longitude?: number;
  Features?: string | string[];
  Furnishing?: string;
  Developer?: string;
  Building_Rating?: number;
  District?: string;
  Date_Listed?: string;
  Agent_Name?: string;
  Agency_Name?: string;
  Agent_Phone?: string;
  Off_Plan_Status?: string;
}

interface PropertyContextType {
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  highlightedProperties: Property[];
  setHighlightedProperties: (properties: Property[]) => void;
  clearSelection: () => void;
  propertyTour: Property[];
  setPropertyTour: (properties: Property[]) => void;
  currentTourIndex: number;
  setCurrentTourIndex: (index: number) => void;
  isInTourMode: boolean;
  setIsInTourMode: (inTour: boolean) => void;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [highlightedProperties, setHighlightedProperties] = useState<Property[]>([]);
  const [propertyTour, setPropertyTour] = useState<Property[]>([]);
  const [currentTourIndex, setCurrentTourIndex] = useState(0);
  const [isInTourMode, setIsInTourMode] = useState(false);

  const clearSelection = () => {
    setSelectedProperty(null);
    setHighlightedProperties([]);
    setPropertyTour([]);
    setCurrentTourIndex(0);
    setIsInTourMode(false);
  };

  return (
    <PropertyContext.Provider
      value={{
        selectedProperty,
        setSelectedProperty,
        highlightedProperties,
        setHighlightedProperties,
        clearSelection,
        propertyTour,
        setPropertyTour,
        currentTourIndex,
        setCurrentTourIndex,
        isInTourMode,
        setIsInTourMode,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const usePropertyContext = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
};