import { DateTime } from "luxon";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import {
  countries,
  getCountryName,
  sanitizeCountryName,
} from "../domain/countries";
import { useGuesses } from "../hooks/useGuesses";
import { CountryInput } from "./CountryInput";
import * as geolib from "geolib";
import { Share } from "./Share";
import { Guesses } from "./Guesses";
import { useTranslation } from "react-i18next";
import { SettingsData } from "../hooks/useSettings";
import { useMode } from "../hooks/useMode";
import { useCountry } from "../hooks/useCountry";
import { Twemoji } from "@teuteuf/react-emoji-render";

// START ADDED IMPORTS
import DateAdapter from "@mui/lab/AdapterDateFns";
import { LocalizationProvider, DatePicker } from "@mui/lab";
import { TextField } from "@mui/material";
// END ADDED IMPORTS


function getDayString() {
  return DateTime.now().toFormat("yyyy-MM-dd");
}

const MAX_TRY_COUNT = 6;

interface GameProps {
  settingsData: SettingsData;
}

export function Game({ settingsData }: GameProps) {
  const { t, i18n } = useTranslation();
  const dayString = useMemo(getDayString, []);

  const countryInputRef = useRef<HTMLInputElement>(null);

  // START MODIFIED CODE 1
  // Let's you select new date
  const [selDate, setSelectedDate] = useState<string | null>(dayString);

  // This is a very hacky way to get the date on the right format. TODO: fix.
  // 1) It takes the string from the DatePicker 
  // 2) creates a new Date element 
  // 3) converts it to a ISO string
  // 4) Removes the time from the ISO string
  const dateToFormattedIsoString = selDate && new Date(selDate).toISOString().split('T')[0];

  // If the selectedDate/ Formated Date is not null: use this, else use today
  const selectedDate = selDate && dateToFormattedIsoString ? dateToFormattedIsoString : dayString;
  // END MODIFIED CODE 1

  const [country, randomAngle, imageScale] = useCountry(selectedDate);

  const [currentGuess, setCurrentGuess] = useState("");

  console.log(selectedDate);

  const [guesses, addGuess] = useGuesses(selectedDate);
  const [hideImageMode, setHideImageMode] = useMode(
    "hideImageMode",
    selectedDate,
    settingsData.noImageMode
  );
  const [rotationMode, setRotationMode] = useMode(
    "rotationMode",
    selectedDate,
    settingsData.rotationMode
  );

  const gameEnded =
    guesses.length === MAX_TRY_COUNT ||
    guesses[guesses.length - 1]?.distance === 0;

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const guessedCountry = countries.find(
        (country) =>
          sanitizeCountryName(
            getCountryName(i18n.resolvedLanguage, country)
          ) === sanitizeCountryName(currentGuess)
      );

      if (guessedCountry == null) {
        toast.error(t("unknownCountry"));
        return;
      }

      const newGuess = {
        name: currentGuess,
        distance: geolib.getDistance(guessedCountry, country),
        direction: geolib.getCompassDirection(
          guessedCountry,
          country,
          (origin, dest) =>
            Math.round(geolib.getRhumbLineBearing(origin, dest) / 45) * 45
        ),
      };

      addGuess(newGuess);
      setCurrentGuess("");

      if (newGuess.distance === 0) {
        toast.success(t("welldone"), { delay: 2000 });
      }
    },
    [addGuess, country, currentGuess, i18n.resolvedLanguage, t]
  );

  useEffect(() => {
    if (
      guesses.length === MAX_TRY_COUNT &&
      guesses[guesses.length - 1].distance > 0
    ) {
      toast.info(getCountryName(i18n.resolvedLanguage, country).toUpperCase(), {
        autoClose: false,
        delay: 2000,
      });
    }
  }, [country, guesses, i18n.resolvedLanguage]);

  return (
    <div className="flex-grow flex flex-col mx-2">
      {hideImageMode && !gameEnded && (
        <button
          className="border-2 uppercase my-2 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          type="button"
          onClick={() => setHideImageMode(false)}
        >
          <Twemoji
            text={t("showCountry")}
            options={{ className: "inline-block" }}
          />
        </button>
      )}
      <div className="my-1">
        <img
          className={`max-h-52 m-auto transition-transform duration-700 ease-in dark:invert ${
            hideImageMode && !gameEnded ? "h-0" : "h-full"
          }`}
          alt="country to guess"
          src={`images/countries/${country.code.toLowerCase()}/vector.svg`}
          style={
            rotationMode && !gameEnded
              ? {
                  transform: `rotate(${randomAngle}deg) scale(${imageScale})`,
                }
              : {}
          }
        />
      </div>
      {rotationMode && !hideImageMode && !gameEnded && (
        <button
          className="border-2 uppercase mb-2 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
          type="button"
          onClick={() => setRotationMode(false)}
        >
          <Twemoji
            text={t("cancelRotation")}
            options={{ className: "inline-block" }}
          />
        </button>
      )}
      <Guesses
        rowCount={MAX_TRY_COUNT}
        guesses={guesses}
        settingsData={settingsData}
        countryInputRef={countryInputRef}
      />
      <div className="my-2">
        {gameEnded ? (
          <>
            <Share
              guesses={guesses}
              dayString={selectedDate}
              settingsData={settingsData}
              hideImageMode={hideImageMode}
              rotationMode={rotationMode}
            />
            <a
              className="underline w-full text-center block mt-4"
              href={`https://www.google.com/maps?q=${getCountryName(
                i18n.resolvedLanguage,
                country
              )}+${country.code.toUpperCase()}&hl=${i18n.resolvedLanguage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twemoji
                text={t("showOnGoogleMaps")}
                options={{ className: "inline-block" }}
              />
            </a>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col">
              <CountryInput
                inputRef={countryInputRef}
                currentGuess={currentGuess}
                setCurrentGuess={setCurrentGuess}
              />
              <button
                className="flex items-center justify-center border-2 uppercase my-0.5 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
                type="submit"
              >
                <Twemoji
                  text="🌍"
                  options={{ className: "inline-block" }}
                  className="flex items-center justify-center"
                />{" "}
                <span className="ml-1">{t("guess")}</span>
              </button>
            </div>
          </form>
        )}
      </div>
      {/* START MODIFIED CODE 2 - ADDS A MUI DATEPICKER */}
      <LocalizationProvider dateAdapter={DateAdapter}>
        <DatePicker
          inputFormat="yyyy-MM-dd"
          label="Select date"
          value={selectedDate}
          onChange={(newValue) => {
            setSelectedDate(newValue);
          }}
          renderInput={(params) => <TextField {...params} />}
        />
      </LocalizationProvider>
      {/* END MODIFIED CODE 2 */}
    </div>
  );
}
