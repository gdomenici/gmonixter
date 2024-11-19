import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Typography,
  Button,
} from "@material-tailwind/react";

import React, { useState, useEffect } from "react";
import { getToken } from "./components/Utils";

interface PlaylistCategory {
  fullDetailsUrl: string;
  firstIconUrl: string;
  id: string;
  name: string;
}

interface PlaylistSelectorAdvancedProps {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const PlaylistSelectorAdvanced: React.FC<PlaylistSelectorAdvancedProps> = (
  props: PlaylistSelectorAdvancedProps
) => {
  const [categories, setCategories] = useState<PlaylistCategory[]>([]);

  const getFeaturedPlaylists = async () => {
    try {
      props.setLoading(false);
      props.setError(null);
      const token = getToken();
      const response = await fetch(
        `https://api.spotify.com/v1/browse/featured-playlists`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch featured playlists");
      }

      const featuredPlaylists = await response.json();
      return featuredPlaylists;
    } catch (err) {
      if (err instanceof Error) {
        props.setError(err.message);
      } else {
        props.setError("An unexpected error occurred");
      }
    } finally {
      props.setLoading(false);
    }
  };

  const getPlaylistCategories = async () => {
    try {
      props.setLoading(false);
      props.setError(null);

      const token = getToken();
      const response = await fetch(
        `https://api.spotify.com/v1/browse/categories`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch playlist categories");
      }

      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));

      const tempCategories: PlaylistCategory[] = data.categories.items.map(
        (oneItem: any) => ({
          fullDetailsUrl: oneItem.href,
          firstIconUrl: oneItem.icons?.[0]?.url,
          id: oneItem.id,
          name: oneItem.name,
        })
      );

      setCategories(tempCategories);
    } catch (err) {
      if (err instanceof Error) {
        props.setError(err.message);
      } else {
        props.setError("An unexpected error occurred");
      }
    } finally {
      props.setLoading(false);
    }
  };

  const getCategoriesGridCells = () => {
    const divs: any = [];
    categories.forEach((oneCategory: PlaylistCategory) => {
      divs.push(
        <div>
          <Card className="mt-6 w-96">
            <CardHeader color="blue-gray">
              <img src={oneCategory.firstIconUrl} alt={oneCategory.name} />
            </CardHeader>
            <CardBody>
              <Typography variant="h5" color="blue" className="mb-2">
                {oneCategory.name}
              </Typography>
              <Typography>{oneCategory.id}</Typography>
            </CardBody>
            {/* <CardFooter className="pt-0">
          <Button>Read More</Button>
        </CardFooter> */}
          </Card>
        </div>
      );
    });
    return divs;
  };

  useEffect(() => {
    getPlaylistCategories();
  }, []);

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Card className="mt-6 w-96">
            <CardHeader color="blue-gray">
              <img
                src="/img/Spotify_Full_Logo_RGB_Green.png"
                alt="Spotify logo"
              />
            </CardHeader>
            <CardBody>
              <Typography variant="h5" color="blue" className="mb-2">
                Featured Playlists
              </Typography>
              <Typography>Today's trending playlists</Typography>
            </CardBody>
            <CardFooter className="pt-0">
              <Button>Read More</Button>
            </CardFooter>
          </Card>
        </div>
        <>{categories && getCategoriesGridCells()}</>
        {/* <div>02</div>
        <div>03</div>
        <div>04</div>
        <div>05</div>
        <div>06</div>
        <div>07</div>
        <div>08</div> */}
      </div>
    </>
  );
};

export default PlaylistSelectorAdvanced;
