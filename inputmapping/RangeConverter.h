//
// Input Mapping Demo
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Wrapper class for converting raw input range values to sensitivity-calibrated range values
//

#pragma once


// Dependencies
#include <map>
#include "InputConstants.h"


namespace InputMapping
{

	class RangeConverter
	{
	// Internal helpers
	private:
		struct Converter
		{
			double MinimumInput;
			double MaximumInput;

			double MinimumOutput;
			double MaximumOutput;

			template <typename RangeType>
			RangeType Convert(RangeType invalue) const
			{
				double v = static_cast<double>(invalue);
				if(v < MinimumInput)
					v = MinimumInput;
				else if(v > MaximumInput)
					v = MaximumInput;

				double interpolationfactor = (v - MinimumInput) / (MaximumInput - MinimumInput);
				return static_cast<RangeType>((interpolationfactor * (MaximumOutput - MinimumOutput)) + MinimumOutput);
			}
		};

	// Internal type shortcuts
	private:
		typedef std::map<Range, Converter> ConversionMapT;

	// Construction
	public:
		explicit RangeConverter(std::wifstream& infile);

	// Conversion interface
	public:
		template <typename RangeType>
		RangeType Convert(Range rangeid, RangeType invalue) const
		{
			ConversionMapT::const_iterator iter = ConversionMap.find(rangeid);
			if(iter == ConversionMap.end())
				return invalue;

			return iter->second.Convert<RangeType>(invalue);
		}

	// Internal tracking
	private:
		ConversionMapT ConversionMap;
	};

}

