//
// Input Mapping Demo
// By Mike Lewis, June 2011
// http://scribblings-by-apoch.googlecode.com/
//
// Wrapper class for converting raw input range values to sensitivity-calibrated range values
//

#include "pch.h"

#include "RangeConverter.h"
#include "FileIO.h"

#include <fstream>


using namespace InputMapping;


//
// Construct the converter and load the conversion table provided
//
RangeConverter::RangeConverter(std::wifstream& infile)
{
	if(!infile)
		throw std::exception("Invalid file provided to RangeConverter constructor");

	unsigned numconversions = AttemptRead<unsigned>(infile);
	for(unsigned i = 0; i < numconversions; ++i)
	{
		Range range;
		Converter converter;

		range = static_cast<Range>(AttemptRead<unsigned>(infile));
		converter.MinimumInput = AttemptRead<double>(infile);
		converter.MaximumInput = AttemptRead<double>(infile);
		converter.MinimumOutput = AttemptRead<double>(infile);
		converter.MaximumOutput = AttemptRead<double>(infile);

		if((converter.MaximumInput < converter.MinimumInput) || (converter.MaximumOutput < converter.MinimumOutput))
			throw std::exception("Invalid input range conversion");

		ConversionMap.insert(std::make_pair(range, converter));
	}
}


